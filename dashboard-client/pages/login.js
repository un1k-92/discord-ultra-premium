export default function Login() {
  return (
    <div>
      <h1>Connexion</h1>
      <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/discord`}>
        <button>Se connecter avec Discord</button>
      </a>
    </div>
  );
}
