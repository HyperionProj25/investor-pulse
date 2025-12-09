import { createClient } from "@supabase/supabase-js";

export default async function TestDbPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div style={{ padding: "2rem", fontFamily: "monospace" }}>
        <h1 style={{ color: "red" }}>❌ Missing Environment Variables</h1>
        <p>NEXT_PUBLIC_SUPABASE_URL: {supabaseUrl ? "✅ Set" : "❌ Missing"}</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseAnonKey ? "✅ Set" : "❌ Missing"}</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("site_state")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    return (
      <div style={{ padding: "2rem", fontFamily: "monospace" }}>
        <h1 style={{ color: "red" }}>❌ Database Error</h1>
        <pre style={{ background: "#fee", padding: "1rem", borderRadius: "8px" }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1 style={{ color: "green" }}>✅ Database Connection Successful!</h1>
      <p>Fetched from <code>site_state</code> table:</p>
      <pre
        style={{
          background: "#f0f0f0",
          padding: "1rem",
          borderRadius: "8px",
          overflow: "auto",
          maxHeight: "80vh",
        }}
      >
        {JSON.stringify(data.payload, null, 2)}
      </pre>
    </div>
  );
}

