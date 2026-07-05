import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/verification")({
  component: VerificationPage,
});

type Profile = {
  id: string;
  full_name: string;
  kyc_status?: string | null;
  kyc_note?: string | null;
};

type Document = {
  id: string;
  document_type: string;
  document_url: string | null;
  status: string;
  created_at: string;
};

export default function VerificationPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentType, setDocumentType] = useState("Passport");
  const [uploading, setUploading] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const loggedIn = await isAuthed();

    if (!loggedIn) {
      router.navigate({ to: "/" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,full_name,kyc_status,kyc_note")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    const { data: docs } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    setDocuments(docs || []);
  }

  async function uploadDocument() {
    const file = fileInput.current?.files?.[0];

    if (!file || !profile) {
      alert("Select a document first.");
      return;
    }

    setUploading(true);

    const fileName = `${profile.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("kyc")
      .upload(fileName, file);

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("kyc")
      .getPublicUrl(fileName);

    await supabase.from("kyc_documents").insert({
      profile_id: profile.id,
      document_type: documentType,
      document_url: data.publicUrl,
      status: "pending",
    });

    await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
      })
      .eq("id", profile.id);

    setUploading(false);

    if (fileInput.current) fileInput.current.value = "";

    loadData();
  }

  function StatusCard() {
    const status = profile?.kyc_status || "pending";

    if (status === "verified")
      return (
        <div className="rounded-2xl bg-success/10 p-5 border border-success/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-success h-6 w-6" />
            <div>
              <h3 className="font-semibold">Verified</h3>
              <p className="text-sm text-muted-foreground">
                Your identity has been successfully verified.
              </p>
            </div>
          </div>
        </div>
      );

    if (status === "rejected")
      return (
        <div className="rounded-2xl bg-destructive/10 p-5 border border-destructive/30">
          <div className="flex items-center gap-3">
            <XCircle className="text-destructive h-6 w-6" />
            <div>
              <h3 className="font-semibold">Rejected</h3>
              <p className="text-sm text-muted-foreground">
                {profile?.kyc_note || "Please upload new documents."}
              </p>
            </div>
          </div>
        </div>
      );

    return (
      <div className="rounded-2xl bg-gold/10 p-5 border border-gold/30">
        <div className="flex items-center gap-3">
          <Clock3 className="text-gold h-6 w-6" />
          <div>
            <h3 className="font-semibold">Pending Review</h3>
            <p className="text-sm text-muted-foreground">
              Your documents are currently under review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        <div>
          <div className="flex items-center gap-2 text-gold">
            <ShieldCheck className="h-5 w-5" />
            Identity Verification
          </div>

          <h1 className="mt-2 text-3xl font-display font-semibold">
            KYC Verification
          </h1>

          <p className="text-muted-foreground mt-1">
            Upload your identification documents for verification.
          </p>
        </div>

        <StatusCard />

        <div className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Upload Document
          </h2>

          <div className="space-y-4">

            <select
              value={documentType}
              onChange={(e)=>setDocumentType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option>Passport</option>
              <option>National ID</option>
              <option>Driver's License</option>
              <option>Proof of Address</option>
            </select>

            <input
              ref={fileInput}
              type="file"
            />

            <Button
              disabled={uploading}
              onClick={uploadDocument}
            >
              <Upload className="mr-2 h-4 w-4"/>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>

          </div>
        </div>

        <div className="glass-strong p-6">

          <h2 className="font-display text-xl font-semibold mb-5">
            Uploaded Documents
          </h2>

          {documents.length===0 ? (

            <p className="text-muted-foreground">
              No documents uploaded.
            </p>

          ):(
            <div className="space-y-3">

              {documents.map(doc=>(
                <div
                  key={doc.id}
                  className="rounded-xl border border-border p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {doc.document_type}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">

                    <span className="text-sm capitalize">
                      {doc.status}
                    </span>

                    {doc.document_url && (
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold hover:underline"
                      >
                        View
                      </a>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </AppShell>
  );
}