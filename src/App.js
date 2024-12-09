import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';
import FileUpload from './FileUpload'; // Assuming you have this component

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      colorBy: 'Sentiment', // Default coloring based on sentiment
      selectedTweets: [],
    };
    this.svgRef = React.createRef();
  }

  setData = (jsonData) => {
    // Limit the data to 300 tweets
    const slicedData = jsonData.slice(0, 300);
    this.setState({ data: slicedData }, this.createVisualization);
  };

  createVisualization = () => {
    const { data } = this.state;
    const svg = d3.select(this.svgRef.current);
    svg.selectAll('*').remove(); // Clear the previous visualization

    const width = 800;
    const height = 600;
    const padding = 20;


    // Group tweets by month
    const months = ['March', 'April', 'May'];
    const monthGroups = d3.group(data, (d) => d.Month);

    // Create nodes for force simulation
    const nodes = [];
    months.forEach((month, index) => {
      const monthData = monthGroups.get(month) || [];
      monthData.forEach((tweet) => {
        nodes.push({
          tweet,
          month,
          x: width / 2, // Initial x position
          y: (index + 0.5) * (height / months.length), // Initial y based on month
        });
      });
    });

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-10))
      .force('x', d3.forceX(width / 2).strength(0.35))
      .force('y', d3.forceY((d) => (months.indexOf(d.month) + 0.5) * (height / months.length)).strength(10))
      .force('collide', d3.forceCollide(10))
      .on('tick', () => this.updatePositions(svg, nodes));

    // Add month labels
    svg
      .selectAll('text.month-label')
      .data(months)
      .join('text')
      .attr('class', 'month-label')
      .attr('x', padding)
      .attr('y', (d, i) => (i + 0.5) * (height / months.length))
      .attr('text-anchor', 'start')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text((d) => d);

    // Add legend
    this.createLegend(svg, width, height);
  };

  updatePositions = (svg, nodes) => {
    const { colorBy } = this.state;
  
    // Define color scales for both Sentiment and Subjectivity
    const sentimentColorScale = d3
      .scaleLinear()
      .domain([-1, 0, 1])
      .range(['red', '#ECECEC', 'green']);
  
    const subjectivityColorScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range(['#ECECEC', '#4467C4']);
  
    const colorScale =
      colorBy === 'Sentiment' ? sentimentColorScale : subjectivityColorScale;
  
    const circles = svg.selectAll('circle').data(nodes);
  
    // Ensure circles are properly updated
    circles
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 8)
      .attr('fill', (d) => colorScale(d.tweet[colorBy])) // Set color dynamically based on colorBy
      .attr('stroke', (d) => this.isSelected(d.tweet) ? 'black' : 'none')
      .attr('stroke-width', (d) => this.isSelected(d.tweet) ? 2 : 0)
      .on('click', (event, d) => {
        this.handleTweetClick(d.tweet); // Handle click to toggle between Sentiment and Subjectivity
      });
  };

  
  createLegend = (svg, width, height) => {
    const { colorBy } = this.state;
  
    // Define color scales
    const sentimentColorScale = d3
      .scaleLinear()
      .domain([-1, 0, 1])
      .range(['green', '#ECECEC', 'red']);
  
    const subjectivityColorScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range(['#4467C4','#ECECEC']);
  
    const colorScale =
      colorBy === 'Sentiment' ? sentimentColorScale : subjectivityColorScale;
  
    const legendHeight = 200;
    const legendWidth = 20;
    const legendPadding = 10;
  
    const legendX = width - legendWidth - legendPadding;
    const legendY = height / 2 - legendHeight / 2;
  
    // Number of steps for the legend
    const steps = 20;
    const stepHeight = legendHeight / steps;
  
    // Create data for rectangles
    const legendData = d3.range(steps).map((i) => ({
      color: colorScale(-1 + i * (2 / (steps - 1))),
    }));
  
    // Add rectangles for the legend
    svg
      .selectAll('rect.legend-step')
      .data(legendData)
      .join('rect')
      .attr('class', 'legend-step')
      .attr('x', legendX)
      .attr('y', (d, i) => legendY + i * stepHeight)
      .attr('width', legendWidth)
      .attr('height', stepHeight)
      .style('fill', (d) => d.color);

    const labels = colorBy === 'Sentiment'
      ? ['Positive', 'Negative'] // Sentiment labels
      : ['Subjective', 'Objective']; // Subjectivity labels
  
    // Margin between label and legend
    const labelMargin = 5;
  
    svg
      .selectAll('.legend-label')
      .data(labels)
      .join('text')
      .attr('class', 'legend-label')
      .attr('x', legendX + legendWidth)
      .attr('y', (d, i) =>
        i === 0
          ? legendY - labelMargin +17 // Position for the top label
          : legendY + legendHeight + labelMargin -10 // Position for the bottom label
      )
      .attr('text-anchor', 'start')
      .text((d) => d)
      .attr('font-size', '12px')
      .style('fill', 'black');
  
    const legendScale = d3.scaleLinear().domain([-1, 1]).range([legendY + legendHeight, legendY]);
  };

  handleDropdownChange = (event) => {
    this.setState({ colorBy: event.target.value }, () => {
      const svg = d3.select(this.svgRef.current);
      const nodes = svg.selectAll('circle').data();
      this.updatePositions(svg, nodes);
      this.createLegend(svg, 800, 600);
    });
  };

  handleTweetClick = (tweet) => {
    // Toggle the color property between Sentiment and Subjectivity
    this.setState((prevState) => {
      const alreadySelected = prevState.selectedTweets.some((t) => t.idx === tweet.idx);
      const updatedTweets = alreadySelected
        ? prevState.selectedTweets.filter((t) => t.idx !== tweet.idx)
        : [tweet, ...prevState.selectedTweets];
      
      return { selectedTweets: updatedTweets };
    }, () => {
      const svg = d3.select(this.svgRef.current);
      const nodes = svg.selectAll('circle').data();
      this.updatePositions(svg, nodes); // Re-render circles with the new color property
      this.createLegend(svg, 800, 600); // Re-create legend to match the new color property
    });
};

  isSelected = (tweet) => {
    return this.state.selectedTweets.some((t) => t.idx === tweet.idx);
  };

  render() {
    const { selectedTweets } = this.state;

    return (
      <div>
        <FileUpload set_data={this.setData} />
        <div className="colorby">
          <label>Color By: </label>
          <select onChange={this.handleDropdownChange}>
            <option value="Sentiment">Sentiment</option>
            <option value="Subjectivity">Subjectivity</option>
          </select>
        </div>
        <svg ref={this.svgRef} width="1000" height="600"></svg>
        <div class="tweets">
          {selectedTweets.map((tweet) => (
            <div key={tweet.idx}>
              <p>{tweet.RawTweet}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default App;
