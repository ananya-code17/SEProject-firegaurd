import React, { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("https://api.example.com/wildfire-impact") // Replace with actual API
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">🔥 Economic Recovery Dashboard</h1>
      <p className="dashboard-description">Track and visualize wildfire impact in real-time.</p>
      {loading ? <div className="loader"></div> : (
        <div className="chart-container">
          <LineChart width={700} height={350} data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="impact" stroke="#ff5733" strokeWidth={3} dot={{ r: 5, fill: "#ff5733" }} />
          </LineChart>
        </div>
      )}
    </div>
  );
};

export default Dashboard;