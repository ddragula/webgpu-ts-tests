// import redFragShader from './shaders/red.frag.wgsl';
// import triangleVertShader from './shaders/triangle.vert.wgsl';
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
            -0.8, -0.8, // Triangle 1 (Blue)
            0.8, -0.8,
            0.8,  0.8,

            -0.8, -0.8, // Triangle 2 (Red)
            0.8,  0.8,
            -0.8,  0.8,
        ]);

        const vertexBuffer = device.createBuffer({
            label: 'Cell vertices',
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(vertexBuffer, 0, vertices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            } as GPUVertexAttribute],
        };

        const cellShaderModule = device.createShaderModule({
            label: 'Cell shader',
            code: basicShader,
        });

        const cellPipeline = device.createRenderPipeline({
            label: 'Cell pipeline',
            layout: 'auto',
            vertex: {
                module: cellShaderModule,
                entryPoint: 'vertexMain',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: cellShaderModule,
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
                clearValue: [ 0, 0.5, 0.8, 1],
                storeOp: 'store' as GPUStoreOp,
            }],
        });
        pass.setPipeline(cellPipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.draw(vertices.length / 2);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }
}
