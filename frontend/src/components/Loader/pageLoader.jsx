
import './pageLoader.css';

const PageLoader = () => {
  return (
    <div className="page-loader">
      <div className="loader-container">
        <div className="loader-spinner">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="loader-bar" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </div>
        <div className="loader-text">Loading...</div>
      </div>
    </div>
  );
};

export default PageLoader;