import vertexShader from './shaders/vertex.wgsl';
import fragmentShader from './shaders/fragment.wgsl';
import pickingVertexShader from './shaders/picking_vertex.wgsl';
import pickingFragmentShader from './shaders/picking_fragment.wgsl';
import { mix, type vec3 } from './utils';

/**
 * Main class of the application.
 */
export default class App {
    private canvas: HTMLCanvasElement;
    private log: HTMLTextAreaElement;
    private zoom = new Float32Array([1]);
    private device?: GPUDevice;
    private frame?: () => void;
    private pixelBuffer?: GPUBuffer;
    private pickingTexture?: GPUTexture;
    private instanceData = this.generateInstances(100000);
    //private instanceData = new Float32Array([-0.5, -0.5, 0, 0.5, 0.5, 1]);

    /**
     * Crates an instance of the application.
     * @param canvas - HTML canvas
     */
    constructor(canvas: HTMLCanvasElement) {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.canvas = canvas;

        this.log = document.getElementById('log') as HTMLTextAreaElement;

        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();

            const zoomSpeed = 0.001;
            this.zoom[0] /= 1 + zoomSpeed * event.deltaY;

            this.frame?.();
        });

        let isMappingPending = false;
        let pickedInstanceId = 0;
        canvas.addEventListener('mousemove', async (event) => {
            if (isMappingPending || !this.device || !this.pickingTexture) {
                return;
            }
            isMappingPending = true;

            const rect = canvas.getBoundingClientRect();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // Przelicz współrzędne kursora na współrzędne w canvasie
            const x = (event.clientX - rect.left) * canvasWidth / rect.width;
            const y = (event.clientY - rect.top) * canvasHeight / rect.height;

            if (!this.pixelBuffer) {
                this.pixelBuffer = this.device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                });
            }

            const { device, pixelBuffer } = this;

            const commandEncoder = device.createCommandEncoder();
            commandEncoder.copyTextureToBuffer({
                texture: this.pickingTexture,
                origin: { x: Math.floor(x), y: Math.floor(y) },
                aspect: 'all',
            }, {
                buffer: pixelBuffer,
                offset: 0,
                bytesPerRow: 256,
            }, [1, 1, 1]);

            device.queue.submit([commandEncoder.finish()]);

            try {
                await pixelBuffer.mapAsync(GPUMapMode.READ);
                const pixelData = new Uint8Array(pixelBuffer.getMappedRange());

                const id = pixelData[0] << 16 | pixelData[1] << 8 | pixelData[2];

                pixelBuffer.unmap();
                isMappingPending = false;

                if (id !== pickedInstanceId) {
                    this.showTooltip(id ? id - 1 : null);
                    pickedInstanceId = id;
                }
            } catch (e) {
                isMappingPending = false;
            }
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
     * Shows tooltip with instance data for the picked instance.
     * @param instanceId - ID of the picked instance
     */
    showTooltip(instanceId: number | null) {
        if (instanceId !== null) {
            const data = [];
            for (let i = 0; i < 3; i++) {
                data.push(this.instanceData[instanceId * 3 + i]);
            }

            const blue: vec3 = [0.17255, 0.68627, 0.99608] as const;
            const red: vec3 = [1.0, 0.0, 0.0] as const;

            this.log.innerText = JSON.stringify({
                id: instanceId,
                data,
            }, null, 4);

            this.log.style.borderColor = `rgb(${mix(blue, red, data[2]).map((c) => Math.round(c * 255)).join(', ')})`;
        }
    }

    /**
     * Asynchronous function that runs the application.
     */
    async run() {
        const { canvas } = this;
        const adapter = await navigator.gpu.requestAdapter();
        const device = this.device = await adapter.requestDevice();
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

        const { instanceData } = this;

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

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform',
                },
            }] as GPUBindGroupLayoutEntry[],
        });

        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: zoomUniformBuffer,
                    },
                },
            ],
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        });

        const vertexShaderModule = device.createShaderModule({ code: vertexShader });
        const fragmentShaderModule = device.createShaderModule({ code: fragmentShader });

        const pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
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

        this.pickingTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });

        const pickingPipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: device.createShaderModule({ code: pickingVertexShader }),
                entryPoint: 'main',
                buffers: [vertexBufferLayout, instanceBufferLayout],
            },
            fragment: {
                module: device.createShaderModule({ code: pickingFragmentShader }),
                entryPoint: 'main',
                targets: [{
                    format: 'rgba8unorm' as GPUTextureFormat,
                }],
            },
            primitive: {
                topology: 'triangle-strip',
                stripIndexFormat: undefined,
            },
        });

        this.frame = function () {
            const commandEncoder = device.createCommandEncoder();

            {
                const pickingPassDesc: GPURenderPassDescriptor = {
                    colorAttachments: [
                        {
                            view: this.pickingTexture.createView(),
                            loadOp: 'clear' as GPULoadOp,
                            storeOp: 'store' as GPUStoreOp,
                            clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        },
                    ],
                };

                const pickingPass = commandEncoder.beginRenderPass(pickingPassDesc);
                pickingPass.setPipeline(pickingPipeline);
                pickingPass.setVertexBuffer(0, quadVertexBuffer);
                pickingPass.setVertexBuffer(1, instanceBuffer);
                pickingPass.setBindGroup(0, bindGroup);
                pickingPass.draw(4, instanceData.length / 3, 0, 0);
                pickingPass.end();
            }

            {
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
            }

            device.queue.submit([commandEncoder.finish()]);
        };

        this.frame();
    }
}
