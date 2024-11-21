import React from 'react';
import '../style/Button.css';

// Define types for the props
interface ButtonProps {
  text: string;
  onClick: () => void;  
  children?: React.ReactNode;
  className?: string; 
}

const Button: React.FC<ButtonProps> = ({ text, onClick, className = '' }) => {
  return (
    <button className={`btn ${className}`} onClick={onClick}>
      {text}
    </button>
  );
};

export default Button;
