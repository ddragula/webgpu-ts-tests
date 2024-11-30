import vertexShader from './shaders/vertex.wgsl';
import fragmentShader from './shaders/fragment.wgsl';

/**
 * Main class of the application.
 */
export default class App {
    private canvas: HTMLCanvasElement;
    private zoom = new Float32Array([1]);
    private frame?: () => void;

    /**
     * Crates an instance of the application.
     * @param canvas - HTML canvas
     */
    constructor(canvas: HTMLCanvasElement) {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.canvas = canvas;

        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();

            const zoomSpeed = 0.0001;
            this.zoom[0] /= 1 + zoomSpeed * event.deltaY;

            this.frame?.();
        });
    }

    /**
     * Generates random instances.
     * @param n - number of instances
     */
    generateInstances(n: number) {
        const instanceData = new Float32Array(n * 3);

        for (let i = 0; i < n; i++) {
            const x = Math.random() * 2 - 1;
            const y = Math.random() * 2 - 1;
            const color = Math.random();
            instanceData.set([x, y, color], i * 3);
        }

        return instanceData;
    }

    /**
     * Asynchronous function that runs the application.
     */
    async run() {
        const { canvas } = this;
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
            alphaMode: 'premultiplied',
        });

        const quadVertices = new Float32Array([
            -1, -1,
            1, -1,
            -1,  1,
            1,  1,
        ]);

        const instanceData = this.generateInstances(1000000);

        const zoomUniformBuffer = device.createBuffer({
            size: this.zoom.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const instanceBuffer = device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        const quadVertexBuffer = device.createBuffer({
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(quadVertexBuffer, 0, quadVertices);
        device.queue.writeBuffer(instanceBuffer, 0, instanceData);
        device.queue.writeBuffer(zoomUniformBuffer, 0, this.zoom);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [
                {
                    format: 'float32x2',
                    offset: 0,
                    shaderLocation: 0,
                },
            ] as GPUVertexAttribute[],
            stepMode: 'vertex',
        };

        const instanceBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 12,
            attributes: [
                {
                    shaderLocation: 1, // instancePosition
                    offset: 0,
                    format: 'float32x3',
                },
            ] as GPUVertexAttribute[],
            stepMode: 'instance',
        };

        const vertexShaderModule = device.createShaderModule({ code: vertexShader });
        const fragmentShaderModule = device.createShaderModule({ code: fragmentShader });

        const pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: vertexShaderModule,
                entryPoint: 'main',
                buffers: [vertexBufferLayout, instanceBufferLayout],
            },
            fragment: {
                module: fragmentShaderModule,
                entryPoint: 'main',
                targets: [{
                    format: canvasFormat,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha' as GPUBlendFactor,
                            dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
                            operation: 'add' as GPUBlendOperation,
                        },
                        alpha: {
                            srcFactor: 'one' as GPUBlendFactor,
                            dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
                            operation: 'add' as GPUBlendOperation,
                        },
                    },
                    writeMask: GPUColorWrite.ALL,
                }],
            },
            primitive: {
                topology: 'triangle-strip',
                stripIndexFormat: undefined,
            },
        });

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: zoomUniformBuffer,
                    },
                },
            ],
        });

        this.frame = function () {
            const commandEncoder = device.createCommandEncoder();

            const textureView = context.getCurrentTexture().createView();
            const renderPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [
                    {
                        view: textureView,
                        loadOp: 'clear' as GPULoadOp,
                        storeOp: 'store' as GPUStoreOp,
                        clearValue: { r: 1, g: 1, b: 1, a: 1 },
                    },
                ],
            };

            device.queue.writeBuffer(zoomUniformBuffer, 0, this.zoom);

            const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
            renderPass.setPipeline(pipeline);
            renderPass.setVertexBuffer(0, quadVertexBuffer);
            renderPass.setVertexBuffer(1, instanceBuffer);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.draw(4, instanceData.length / 3, 0, 0);
            renderPass.end();

            device.queue.submit([commandEncoder.finish()]);
        };

        this.frame();
    }
}
