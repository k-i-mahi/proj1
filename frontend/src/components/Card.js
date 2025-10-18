import React from 'react';
import './Card.css';

const Card = ({
  children,
  image,
  badge,
  header,
  footer,
  onClick,
  className = '',
  hover = false,
  padding = 'medium',
}) => {
  return (
    <div
      className={`card ${
        hover ? 'card-hover' : ''
      } card-padding-${padding} ${className}`}
      onClick={onClick}
    >
      {badge && <span className="card-badge">{badge}</span>}

      {image && (
        <div className="card-image">
          <img src={image} alt="Card" />
        </div>
      )}

      {header && <div className="card-header">{header}</div>}

      <div className="card-content">{children}</div>

      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card;
