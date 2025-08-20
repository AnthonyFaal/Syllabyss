import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import './Charts.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const BarChartComponent = ({ data, xKey, yKey, title, color = '#4e73df' }) => (
  <div className="chart-container">
    {title && <h3>{title}</h3>}
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey={yKey} fill={color} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const PieChartComponent = ({ data, dataKey, nameKey, title }) => (
  <div className="chart-container">
    {title && <h3>{title}</h3>}
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export const LineChartComponent = ({ data, xKey, yKey, title, color = '#4e73df' }) => (
  <div className="chart-container">
    {title && <h3>{title}</h3>}
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const AreaChartComponent = ({ data, xKey, yKey, title, color = '#4e73df' }) => (
  <div className="chart-container">
    {title && <h3>{title}</h3>}
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey={yKey} stroke={color} fill={color} fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const CombinedChartComponent = ({ data, xKey, dataKeys, title, colors = COLORS }) => (
  <div className="chart-container">
    {title && <h3>{title}</h3>}
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const StatsCard = ({ title, value, change, icon, color }) => (
  <div className={`metric-card ${color}`}>
    <div className="metric-icon">{icon}</div>
    <div className="metric-content">
      <h3>{title}</h3>
      <p>{value}</p>
      {change && <span>{change}</span>}
    </div>
  </div>
);

export const FieldDistributionChart = ({ data }) => {
  // Process data: convert to integers
  const chartData = data
    .map(item => ({
      field: item.selected_field,
      users: parseInt(item.user_count, 10)
    }))
    .sort((a, b) => b.users - a.users);

  // Custom color palette
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  return (
    <div className="chart-container">
      <h3>User Field Distribution</h3>
      <div style={{ height: '400px', overflowX: 'auto' }}>
        <ResponsiveContainer width={Math.max(chartData.length * 80, 500)} height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="field" 
              interval={0} 
              angle={-45} 
              textAnchor="end"
              height={60}
            />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value) => [`${value} users`, '']} />
            <Bar dataKey="users" name="Users" barSize={40}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for small screens */}
      <div className="mobile-legend">
        {chartData.map((item, index) => (
          <div key={item.field} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span>{item.field}: {item.users} users</span>
          </div>
        ))}
      </div>
    </div>
  );
};

