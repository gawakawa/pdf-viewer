import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { createPdfViewer, loadPdfDocument } from './pdf';
import type { PdfViewerHandle } from './pdf';

type OutlineItem = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number];
type OutlineDest = NonNullable<OutlineItem['dest']>;

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
	const [outline, setOutline] = useState<OutlineItem[]>([]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || handleRef.current) return;
		const handle = createPdfViewer(container);
		handle.eventBus.on('pagesinit', () => {
			handle.viewer.currentScaleValue = 'page-width';
		});
		handleRef.current = handle;
	}, []);

	const openFile = async (file: File) => {
		const handle = handleRef.current;
		if (!handle) return;

		const doc = await loadPdfDocument(file);
		const previousDoc = handle.viewer.pdfDocument;
		handle.linkService.setDocument(doc, null);
		handle.viewer.setDocument(doc);
		void previousDoc?.loadingTask.destroy();

		setOutline((await doc.getOutline()) ?? []);
	};

	const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			void openFile(file);
		}
		event.target.value = '';
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
					<div className="zoom-controls">
						<button type="button" onClick={handleZoomOut}>
							-
						</button>
						<button type="button" onClick={handleZoomIn}>
							+
						</button>
					</div>
				</div>
				<div className="viewer-area">
					<div ref={containerRef} className="pdf-container">
						<div className="pdfViewer" />
					</div>
				</div>
			</div>
		</div>
	);
};

export default App;
