import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function main() {
  const email = "uxhuber+admin-demo@gmail.com";
  const password = "demo1234";

  console.log(`Signing up ${email} via Supabase...`);

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log("✅ Auth user created!");
    console.log("   Confirm email if required, or set email_confirm in Supabase dashboard.");
  } else {
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
