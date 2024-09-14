import './style.css';
import * as Highcharts from 'highcharts';
import HeatmapModule from 'highcharts/modules/heatmap';
import ContourModule from './hc-modules/ContourModule';

import temperatureData from './data/temperature.json';
import perlinData from './data/perlin.json';

HeatmapModule(Highcharts);
ContourModule(Highcharts);

Highcharts.chart('temperature-chart', {
    chart: {
        backgroundColor: 'transparent',
        width: 1000,
        zooming: {
            type: 'xy',
        },
    },
    title: {
        text: 'Temperature Chart',
    },
    xAxis: {
        type: 'datetime',
        gridLineWidth: 0,
        title: {
            text: '',
        },
    },
    yAxis: {
        gridLineWidth: 0,
        labels: {
            format: '{value}:00',
        },
        title: {
            text: '',
        },
    },
    series: [{
        type: 'heatmap',
        data: temperatureData,
        contour: {
            enabled: true,
        },
        showInLegend: false,
    }],
});

Highcharts.chart('perlin-data-map', {
    chart: {
        backgroundColor: 'transparent',
        height: 500,
        width: 500,
        zooming: {
            type: 'xy',
        },
    },
    title: {
        text: 'Perlin Noise',
    },
    xAxis: {
        gridLineWidth: 1,
        title: {
            text: '',
        },
        min: 0,
        max: 49,
    },
    yAxis: {
        gridLineWidth: 1,
        title: {
            text: '',
        },
        min: 0,
        max: 49,
    },
    series: [{
        type: 'heatmap',
        data: perlinData,
        contour: {
            enabled: true,
        },
        showInLegend: false,
    }],
});
