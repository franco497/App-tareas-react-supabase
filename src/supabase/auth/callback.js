// pages/auth/callback.js (Pages Router)
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { client } from '../../supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Supabase maneja automáticamente la sesión desde la URL
      const { data: { session }, error } = await client.auth.getSession();
      
      if (session) {
        // Usuario autenticado exitosamente
        router.push('/dashboard'); // Redirige a tu página principal
      } else if (error) {
        console.error('Error:', error);
        router.push('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return <div>Verificando tu login...</div>;
}