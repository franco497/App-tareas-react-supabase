// src/components/InfoBanner.jsx
function InfoBanner() {
  return (
    <div className="info-banner">
      <div className="info-banner-content">
        <p className="info-banner-text">
          <span className="info-banner-icon">ℹ️</span>
          El sistema está conectado a un back-end de Supabase con una
          base de datos PostgreSQL, puedes probar la integración de la
          API de Gmail enviando una notificación a tu correo
          electrónico. Como es solo con fines demostrativos revisa tu
          carpeta de Spam en caso de no recibirlo
        </p>
      </div>
    </div>
  );
}

export default InfoBanner;