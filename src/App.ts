import redFragShader from './shaders/red.frag.wgsl';
import triangleVertShader from './shaders/triangle.vert.wgsl';

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

        const devicePixelRatio = window.devicePixelRatio;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        context.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });

        const pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: device.createShaderModule({
                    code: triangleVertShader,
                }),
                entryPoint: 'main',
            },
            fragment: {
                module: device.createShaderModule({
                    code: redFragShader,
                }),
                entryPoint: 'main',
                targets: [{
                    format: presentationFormat,
                }],
            },
            primitive: {
                topology: 'triangle-list',
            },
        });

        function frame() {
            const commandEncoder = device.createCommandEncoder();
            const textureView = context.getCurrentTexture().createView();

            const renderPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [{
                    view: textureView,
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: 'clear' as GPULoadOp,
                    storeOp: 'store' as GPUStoreOp,
                }],
            };

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(pipeline);
            passEncoder.draw(3);
            passEncoder.end();

            device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }
}
