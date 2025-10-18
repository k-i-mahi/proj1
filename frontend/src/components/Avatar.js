import React from 'react';
import './Avatar.css';

const Avatar = ({
  src,
  name,
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  online = false,
  onClick,
  className = '',
}) => {
  const getInitials = (name) => {
    if (!name) return '?';

    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getGradient = (name) => {
    // Generate consistent color based on name
    if (!name) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    ];

    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className={`avatar avatar-${size} ${
        onClick ? 'clickable' : ''
      } ${className}`}
      onClick={onClick}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="avatar-image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      <div
        className="avatar-placeholder"
        style={{
          background: getGradient(name),
          display: src ? 'none' : 'flex',
        }}
      >
        {getInitials(name)}
      </div>

      {online && <span className="avatar-online"></span>}
    </div>
  );
};

export default Avatar;
