import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { createPdfViewer, loadPdfDocument } from './pdf';
import type { PdfViewerHandle } from './pdf';

type OutlineItem = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number];
type OutlineDest = NonNullable<OutlineItem['dest']>;

type LastPosition = { scrollTopRatio: number };

const lastPositionKey = (fingerprint: string) => `pdf-viewer:last-position:${fingerprint}`;

const readLastPosition = (fingerprint: string): LastPosition | undefined => {
	const raw = localStorage.getItem(lastPositionKey(fingerprint));
	if (raw === null) return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			!('scrollTopRatio' in parsed) ||
			typeof parsed.scrollTopRatio !== 'number'
		) {
			return undefined;
		}
		return { scrollTopRatio: parsed.scrollTopRatio };
	} catch {
		return undefined;
	}
};

const writeLastPosition = (fingerprint: string, position: LastPosition) => {
	localStorage.setItem(lastPositionKey(fingerprint), JSON.stringify(position));
};

const OutlineList = ({
	items,
	onSelect,
}: {
	items: OutlineItem[];
	onSelect: (dest: OutlineDest) => void;
}) => {
	if (items.length === 0) return null;
	return (
		<ul>
			{items.map((item, index) => {
				const dest = item.dest;
				return (
					<li key={`${item.title}-${index}`}>
						{dest ? (
							<button type="button" onClick={() => onSelect(dest)}>
								{item.title}
							</button>
						) : (
							<span>{item.title}</span>
						)}
						{item.items.length > 0 && <OutlineList items={item.items} onSelect={onSelect} />}
					</li>
				);
			})}
		</ul>
	);
};

const App = () => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const handleRef = useRef<PdfViewerHandle | undefined>(undefined);
	const cleanupRef = useRef<(() => void) | undefined>(undefined);
	const [outline, setOutline] = useState<OutlineItem[]>([]);
	const [fileName, setFileName] = useState<string | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || handleRef.current) return;
		handleRef.current = createPdfViewer(container);
	}, []);

	const openFile = useCallback(async (file: File) => {
		const handle = handleRef.current;
		const container = containerRef.current;
		if (!handle || !container) return;

		cleanupRef.current?.();
		cleanupRef.current = undefined;
		setError(undefined);

		let doc: PDFDocumentProxy;
		try {
			doc = await loadPdfDocument(file);
		} catch {
			setError('PDF を開けませんでした');
			return;
		}

		const fingerprint = doc.fingerprints[0];
		const previousDoc = handle.viewer.pdfDocument;
		handle.linkService.setDocument(doc, null);
		handle.viewer.setDocument(doc);
		void previousDoc?.loadingTask.destroy();

		const outlineItems = await doc.getOutline();
		setOutline(outlineItems ?? []);
		setFileName(file.name);

		const lastPosition = fingerprint ? readLastPosition(fingerprint) : undefined;

		const onPagesInit = () => {
			handle.viewer.currentScaleValue = 'page-width';
			if (!lastPosition) return;
			const maxScrollTop = container.scrollHeight - container.clientHeight;
			container.scrollTop = maxScrollTop > 0 ? lastPosition.scrollTopRatio * maxScrollTop : 0;
		};
		handle.eventBus.on('pagesinit', onPagesInit);

		let saveTimeoutId: number | undefined;
		const onScroll = () => {
			if (!fingerprint) return;
			if (saveTimeoutId !== undefined) window.clearTimeout(saveTimeoutId);
			saveTimeoutId = window.setTimeout(() => {
				const maxScrollTop = container.scrollHeight - container.clientHeight;
				const scrollTopRatio = maxScrollTop > 0 ? container.scrollTop / maxScrollTop : 0;
				writeLastPosition(fingerprint, { scrollTopRatio });
			}, 300);
		};
		container.addEventListener('scroll', onScroll);

		cleanupRef.current = () => {
			handle.eventBus.off('pagesinit', onPagesInit);
			container.removeEventListener('scroll', onScroll);
			if (saveTimeoutId !== undefined) window.clearTimeout(saveTimeoutId);
		};
	}, []);

	const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			void openFile(file);
		}
		event.target.value = '';
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (file) {
			void openFile(file);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
	};

	const handleZoomIn = () => {
		handleRef.current?.viewer.increaseScale();
	};

	const handleZoomOut = () => {
		handleRef.current?.viewer.decreaseScale();
	};

	const handleOutlineSelect = (dest: OutlineDest) => {
		void handleRef.current?.linkService.goToDestination(dest);
	};

	return (
		<div className="app">
			<aside className="sidebar">
				<h2>目次</h2>
				<OutlineList items={outline} onSelect={handleOutlineSelect} />
			</aside>
			<div className="main">
				<div className="toolbar">
					<label className="file-input">
						PDF を開く
						<input type="file" accept="application/pdf" onChange={handleFileInputChange} />
					</label>
					{fileName && <span className="file-name">{fileName}</span>}
					<div className="zoom-controls">
						<button type="button" onClick={handleZoomOut}>
							-
						</button>
						<button type="button" onClick={handleZoomIn}>
							+
						</button>
					</div>
					{error && <span className="error">{error}</span>}
				</div>
				<div className="viewer-area">
					<div
						ref={containerRef}
						className="pdf-container"
						onDragOver={handleDragOver}
						onDrop={handleDrop}
					>
						<div className="pdfViewer" />
						{!fileName && (
							<div className="drop-hint">
								<p>PDF をドラッグ&ドロップ、または「PDF を開く」から選択してください</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default App;
