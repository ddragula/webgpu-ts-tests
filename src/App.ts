import basicShader from './shaders/shader.wgsl';

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

        const vertices = new Float32Array([
            -1, -1, -2.5, -1.5,
            1, -1, 0.5, -1.5,
            1, 1, 0.5, 1.5,
            -1, 1, -2.5, 1.5,
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3,
        ]);

        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        const indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(vertexBuffer, 0, vertices);
        device.queue.writeBuffer(indexBuffer, 0, indices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 16,
            attributes: [{
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0,
            }, {
                format: 'float32x2',
                offset: Float32Array.BYTES_PER_ELEMENT * 2,
                shaderLocation: 1,
            }] as GPUVertexAttribute[],
        };

        const shaderModule = device.createShaderModule({
            code: basicShader,
        });

        const pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexMain',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: canvasFormat,
                }],
            },
        });

        const encoder = device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear' as GPULoadOp,
                clearValue: [ 0, 0, 0, 1],
                storeOp: 'store' as GPUStoreOp,
            }],
        });
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setIndexBuffer(indexBuffer, 'uint16');
        pass.drawIndexed(indices.length);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }
}
