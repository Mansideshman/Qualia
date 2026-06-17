import React from 'react';
import '../styles/MainContainer.css';

export default function MainContainer({ children }) {
  return (
    <main className="main-container">
      <div className="main-content">
        {children}
      </div>
    </main>
  );
}
