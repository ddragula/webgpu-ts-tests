import './style.css';
import * as Highcharts from 'highcharts';
import DataModule from 'highcharts/modules/data';
import HeatmapModule from 'highcharts/modules/heatmap';
import ContourModule from './hc-modules/ContourModule';

import perlinData from './data/perlin.json';
import temperatureCsv from './data/temperature.csv';

DataModule(Highcharts);
HeatmapModule(Highcharts);
ContourModule(Highcharts);

Highcharts.setOptions({
    chart: {
        backgroundColor: 'transparent',
        zooming: {
            type: 'xy',
        },
    },
    xAxis: {
        gridLineWidth: 0,
        title: {
            text: '',
        },
    },
    yAxis: {
        gridLineWidth: 0,
        title: {
            text: '',
        },
    },
    plotOptions: {
        heatmap: {
            showInLegend: false,
            contour: {
                enabled: true,
            },
        },
    },
});

Highcharts.chart('temperature-chart', {
    title: {
        text: 'Temperature Chart',
    },
    data: {
        csv: temperatureCsv,
    },
    xAxis: {
        type: 'datetime',
        tickPixelInterval: 150,
    },
    yAxis: {
        labels: {
            format: '{value}:00',
        },
    },
    colorAxis: {
        stops: [
            [0, '#3060cf'],
            [0.5, '#fffbbc'],
            [0.9, '#c4463a'],
        ],
    },
    series: [{
        type: 'heatmap',
        colsize: 24 * 36e5,
        contour: {
            enabled: true,
        },
    }],
});

Highcharts.chart('perlin-data-map', {
    title: {
        text: 'Perlin Noise (50x50)',
    },
    xAxis: {
        min: 0,
        max: 49,
    },
    yAxis: {
        min: 0,
        max: 49,
    },
    series: [{
        type: 'heatmap',
        data: perlinData,
    }],
});

Highcharts.chart('random-data-map-lq', {
    title: {
        text: 'Random Data (5x10)',
    },
    colorAxis: {},
    series: [{
        type: 'heatmap',
        data: [
            [0, 0, 10], [0, 1, 19], [0, 2, 8], [0, 3, 24], [0, 4, 67],
            [1, 0, 92], [1, 1, 58], [1, 2, 78], [1, 3, 117], [1, 4, 48],
            [2, 0, 35], [2, 1, 15], [2, 2, 123], [2, 3, 64], [2, 4, 52],
            [3, 0, 72], [3, 1, 132], [3, 2, 114], [3, 3, 19], [3, 4, 16],
            [4, 0, 38], [4, 1, 5], [4, 2, 8], [4, 3, 117], [4, 4, 115],
            [5, 0, 88], [5, 1, 32], [5, 2, 12], [5, 3, 6], [5, 4, 120],
            [6, 0, 13], [6, 1, 44], [6, 2, 88], [6, 3, 98], [6, 4, 96],
            [7, 0, 31], [7, 1, 1], [7, 2, 82], [7, 3, 32], [7, 4, 30],
            [8, 0, 85], [8, 1, 97], [8, 2, 123], [8, 3, 64], [8, 4, 84],
            [9, 0, 47], [9, 1, 114], [9, 2, 31], [9, 3, 48], [9, 4, 91],
        ],
    }],
});
