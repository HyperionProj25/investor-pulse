"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";

type Investor = {
  id: string;
  slug: string;
  name: string;
  highlight: string;
  message: string;
  keyQuestions: string[];
};

const AdminInvestorsPage = () => {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Investor>>({});

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return null;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/?mode=admin");
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
        } else {
          router.push("/?mode=admin");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/?mode=admin");
      } finally {
        setSessionChecked(true);
      }
    };
    void verifySession();
  }, [router]);

  useEffect(() => {
    const loadInvestors = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/site-state");
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();
        if (data?.payload?.investors) {
          const mapped = data.payload.investors.map((inv: any, idx: number) => ({
            id: `inv-${idx}`,
            slug: inv.slug,
            name: inv.name,
            highlight: inv.highlight || "",
            message: inv.message || "",
            keyQuestions: inv.keyQuestions || [],
          }));
          setInvestors(mapped);
        }
      } catch (err) {
        console.error("Load failed:", err);
        toast.error("Failed to load investors");
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadInvestors();
  }, [authorizedAdmin]);

  const startEdit = (investor: Investor) => {
    setEditingId(investor.id);
    setFormData({
      ...investor,
      keyQuestions: [...investor.keyQuestions],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const saveEdit = () => {
    // TODO: Implement save functionality
    toast.success("Investor updated (placeholder)");
    setEditingId(null);
  };

  const deleteInvestor = (id: string) => {
    if (!confirm("Delete this investor?")) return;
    // TODO: Implement delete
    toast.success("Investor deleted (placeholder)");
  };

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <AdminNav adminLabel={adminLabel || undefined} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Manage Investors</h1>
          <p className="text-sm text-[#a3a3a3] mt-1">
            Add, edit, or remove investor profiles and personalized content.
          </p>
        </div>

        <div className="space-y-4">
          {investors.map((investor) => (
            <div
              key={investor.id}
              className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6"
            >
              {editingId === investor.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Name
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Slug
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.slug || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Highlight
                    <input
                      className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                      value={formData.highlight || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, highlight: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Message
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                      value={formData.message || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={saveEdit}
                      className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{investor.name}</h3>
                    <p className="text-xs text-[#a3a3a3]">@{investor.slug}</p>
                    {investor.highlight && (
                      <p className="mt-2 text-sm text-[#d4d4d4]">
                        {investor.highlight}
                      </p>
                    )}
                    {investor.message && (
                      <p className="mt-1 text-xs text-[#737373]">
                        {investor.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(investor)}
                      className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs hover:border-[#cb6b1e]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteInvestor(investor.id)}
                      className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="mt-6 rounded-lg border border-[#cb6b1e] px-4 py-2 text-sm hover:bg-[#cb6b1e] hover:text-black"
          onClick={() => toast.info("Add investor (coming soon)")}
        >
          + Add New Investor
        </button>
      </main>
    </div>
  );
};

export default AdminInvestorsPage;
