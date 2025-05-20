import './Button.css';

const Button = ({ onClick, children, variant = 'primary', className, disabled }) => {
  return (
    <button 
      onClick={onClick} 
      className={`btn btn-${variant} ${className || ''}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
