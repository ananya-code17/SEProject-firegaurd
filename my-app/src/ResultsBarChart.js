import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ResultsBarChart = ({ forecastResults }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!forecastResults || !chartRef.current) return;

    // Clear any previous chart
    d3.select(chartRef.current).selectAll('*').remove();

    const data = forecastResults.chartData;
    const margin = { top: 30, right: 30, bottom: 70, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.label))
      .padding(0.2);
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Add Y axis
    const maxValue = d3.max(data, d => d.value);
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1]) // Add 10% padding to top
      .range([height, 0]);
    
    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${d3.format(',')(d)}`));

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Economic Impact Breakdown');

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .text('Economic Impact (USD)');

    // Add bars
    svg.selectAll('bars')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', d => d.color)
      .attr('rx', 5) // Rounded corners
      .attr('ry', 5);

    // Add value labels on top of bars
    svg.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 10)
      .attr('text-anchor', 'middle')
      .text(d => `$${d3.format(',')(d.value)}`)
      .style('font-size', '12px')
      .style('font-weight', 'bold');

    // Animation
    svg.selectAll('rect')
      .attr('y', height)
      .attr('height', 0)
      .transition()
      .duration(800)
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value))
      .delay((d, i) => i * 100);

  }, [forecastResults]);

  return (
    <div className="chart-wrapper">
      <div ref={chartRef} className="bar-chart"></div>
    </div>
  );
};

export default ResultsBarChart;