import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { EventBus, PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';

GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url,
).toString();

// node_modules への symlink 経由で public/ から配信 (public/cmaps, public/standard_fonts)。
// Vite の copyDir は fs.statSync (symlink を辿る) で判定するため、本番ビルドでも実体がコピーされる。
const cMapUrl = '/cmaps/';
const standardFontDataUrl = '/standard_fonts/';

export type PdfViewerHandle = {
	eventBus: EventBus;
	linkService: PDFLinkService;
	viewer: PDFViewer;
};

export const createPdfViewer = (container: HTMLDivElement): PdfViewerHandle => {
	const eventBus = new EventBus();
	const linkService = new PDFLinkService({ eventBus });
	const viewer = new PDFViewer({ container, eventBus, linkService });
	linkService.setViewer(viewer);
	return { eventBus, linkService, viewer };
};

export const loadPdfDocument = async (file: File): Promise<PDFDocumentProxy> => {
	const data = await file.arrayBuffer();
	const loadingTask = getDocument({ data, cMapUrl, cMapPacked: true, standardFontDataUrl });
	return loadingTask.promise;
};
