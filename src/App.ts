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
     * A method that returns mocked data.
     * @param xMin - minimum x-axis value
     * @param xMax - maximum x-axis value
     * @param yMin - minimum y-axis value
     * @param yMax - maximum y-axis value
     * @returns an array of [x, y] pairs
     */
    private mockData(xMin: number, xMax: number, yMin: number, yMax: number) : [number, number][] {
        const data = Array.from({ length: 100 }, (_, i): [number, number] => [
            i, Math.sin(i / 10) * 10 + Math.random(),
        ]);

        return data.map(([x, y]) => [
            (x - xMin) / (xMax - xMin) * 2 - 1,
            (y - yMin) / (yMax - yMin) * 2 - 1,
        ]);
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

        const vertices = new Float32Array(
            this.mockData(0, 99, -20, 20).flat(),
        );

        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(vertexBuffer, 0, vertices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0,
            } as GPUVertexAttribute],
        };

        const cellShaderModule = device.createShaderModule({
            code: basicShader,
        });

        const cellPipeline = device.createRenderPipeline({
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
            primitive: {
                topology: 'line-strip' as GPUPrimitiveTopology,
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
        pass.setPipeline(cellPipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.draw(vertices.length / 2);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }
}
