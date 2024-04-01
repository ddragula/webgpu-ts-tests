/**
 * Main application class.
 */
export default class App {
    private canvas: HTMLCanvasElement;

    /**
     * Creates an instance of the App.
     * @param canvas - canvas HTML Element
     */
    constructor(canvas: HTMLCanvasElement) {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.canvas = canvas;
    }

    /**
     * An asynchronous method that runs the app.
     */
    async run() {
        const { canvas } = this;
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu');
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
        });

        const encoder = device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear' as GPULoadOp,
                clearValue: [ 1, 0, 1, 1],
                storeOp: 'store' as GPUStoreOp,
            }],
        });
        pass.end();

        device.queue.submit([encoder.finish()]);
    }
}
