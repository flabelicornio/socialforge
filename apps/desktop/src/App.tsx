<div style={{ marginBottom: '1rem' }}>
  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
    Fecha y hora de publicación (opcional)
  </label>
  <input
    type="datetime-local"
    value={scheduledFor}
    onChange={(e) => setScheduledFor(e.target.value)}
    style={{
      width: '100%',
      padding: '0.55rem 0.8rem',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#f8fafc', // Fondo sutil que resalta la zona del picker
      color: '#1e293b',
      fontSize: '0.9rem',
      fontWeight: '500',
      boxSizing: 'border-box',
      cursor: 'pointer',
      direction: 'rtl', // Mueve el icono nativo del calendario A LA IZQUIERDA
      textAlign: 'left', // Mantiene el texto alineado de forma natural
      outline: 'none',
      transition: 'all 0.2s ease-in-out',
    }}
    onFocus={(e) => {
      e.target.style.backgroundColor = '#e2e8f0'; // Cambia el fondo cuando se expande o enfoca
      e.target.style.borderColor = '#0066cc';
    }}
    onBlur={(e) => {
      e.target.style.backgroundColor = '#f8fafc'; // Vuelve a su estado normal al salir
      e.target.style.borderColor = '#cbd5e1';
    }}
  />
</div>