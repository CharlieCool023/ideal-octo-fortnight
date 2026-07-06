import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Printer, AlertCircle, Shield } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { EVALUATION_CATEGORIES } from "@/const";

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = id ? parseInt(id) : null;

  const { data: profile, isLoading, error } = trpc.corpsMembers.get.useQuery(
    { id: memberId! },
    { enabled: !!memberId }
  );

  if (!memberId) return <ErrorState message="No profile ID provided" onBack={() => navigate(-1)} />;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
    </div>
  );
  if (error || !profile) return <ErrorState message="The requested profile could not be found" onBack={() => navigate(-1)} />;

  const piEval = profile.evaluations?.platoonInstructor;
  const mowEval = profile.evaluations?.manOWar;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Top bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
            {profile.surname} {profile.otherNames}
          </h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex-shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Profile</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </div>

      {/* A4 profile page */}
      <div className="max-w-4xl mx-auto p-4 print:p-0">
        <div className="bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden print:min-h-[297mm]">

          {/* ── Header ── */}
          <div className="bg-green-800 text-white px-6 py-5 print:px-8 print:py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-10 h-10 text-green-300 flex-shrink-0" />
                <div>
                  <h1 className="text-lg font-bold leading-tight print:text-xl">NYSC CAMP EVALUATION SYSTEM</h1>
                  <p className="text-green-200 text-xs print:text-sm">Corps Member Individual Profile</p>
                </div>
              </div>
              {profile.passportPhoto && (
                <img
                  src={profile.passportPhoto}
                  alt="Passport"
                  className="w-20 h-20 print:w-24 print:h-24 rounded-lg object-cover border-2 border-green-400 flex-shrink-0"
                />
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-green-700">
              <h2 className="text-xl font-bold print:text-2xl">{profile.surname} {profile.otherNames}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-green-100 text-sm">
                <span>{profile.stateCode}</span>
                <span>·</span>
                <span>{profile.callUpNumber}</span>
                <span>·</span>
                <span>Platoon {profile.platoon}</span>
              </div>
            </div>
          </div>

          <div className="p-6 print:p-8 space-y-5 print:space-y-4">

            {/* ── Personal Information ── */}
            <Section title="Personal Information" color="green">
              <Grid>
                <Field label="Surname" value={profile.surname} />
                <Field label="Other Names" value={profile.otherNames} />
                <Field label="State Code" value={profile.stateCode} />
                <Field label="Call-up Number" value={profile.callUpNumber} />
                <Field label="Phone Number" value={formatPhone(profile.phoneNumber)} />
                <Field label="State of Origin" value={profile.stateOfOrigin} />
                <Field label="State of Deployment" value={profile.stateOfDeployment} />
                <Field label="Platoon" value={`Platoon ${profile.platoon}`} />
                {profile.changedName ? <Field label="Former Name" value={profile.formerName || "—"} /> : null}
              </Grid>
            </Section>

            {/* ── Education ── */}
            <Section title="Education" color="blue">
              <Grid>
                <Field label="Qualification" value={profile.qualification} />
                <Field label="Area of Specialization" value={profile.areaOfSpecialization} />
              </Grid>
              {profile.institutions && profile.institutions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Higher Institutions</p>
                  {profile.institutions.map((inst: any, i: number) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm bg-gray-50 print:bg-gray-100 rounded p-2">
                      <span className="font-medium text-gray-800">{inst.institutionName}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(inst.startDate).getFullYear()} – {new Date(inst.endDate).getFullYear()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Evaluation Scores ── */}
            {(piEval || mowEval) && (
              <Section title="Evaluation Scores" color="amber">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200">
                        <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-600">Criteria</th>
                        <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-600">Platoon Instructor</th>
                        <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-600">Man O'War</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EVALUATION_CATEGORIES.map((cat) => (
                        <tr key={cat.key} className="even:bg-gray-50 print:even:bg-gray-50">
                          <td className="border border-gray-200 p-2 text-gray-700">{cat.label}</td>
                          <td className="border border-gray-200 p-2 text-center font-medium">
                            {piEval ? `${(piEval as any)[cat.key]}/10` : "—"}
                          </td>
                          <td className="border border-gray-200 p-2 text-center font-medium">
                            {mowEval ? `${(mowEval as any)[cat.key]}/10` : "—"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 print:bg-green-100 font-bold">
                        <td className="border border-gray-300 p-2 text-gray-800">Overall Average</td>
                        <td className="border border-gray-300 p-2 text-center text-green-700 text-base">
                          {piEval ? piEval.overallAverage : "—"}
                        </td>
                        <td className="border border-gray-300 p-2 text-center text-green-700 text-base">
                          {mowEval ? mowEval.overallAverage : "—"}
                        </td>
                      </tr>
                      {piEval && mowEval && (
                        <tr className="bg-green-100 print:bg-green-200 font-bold">
                          <td className="border border-gray-300 p-2 text-gray-800">Final Combined Score</td>
                          <td colSpan={2} className="border border-gray-300 p-2 text-center text-green-800 text-lg">
                            {((parseFloat(String(piEval.overallAverage)) + parseFloat(String(mowEval.overallAverage))) / 2).toFixed(1)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── Comments ── */}
            {(profile.comments?.length > 0 || profile.commandantComments?.length > 0) && (
              <Section title="Remarks & Comments" color="purple">
                {profile.comments && profile.comments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Soldier Observations</p>
                    <div className="space-y-1">
                      {profile.comments.map((c: any, i: number) => (
                        <p key={i} className="text-sm text-gray-700 bg-blue-50 print:bg-blue-100 rounded p-2">{c.comment}</p>
                      ))}
                    </div>
                  </div>
                )}
                {profile.commandantComments && profile.commandantComments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camp Commandant's Remarks</p>
                    <div className="space-y-1">
                      {profile.commandantComments.map((c: any, i: number) => (
                        <p key={i} className="text-sm text-gray-700 bg-yellow-50 print:bg-yellow-100 rounded p-2">{c.comment}</p>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ── Signature Section ── */}
            <div className="mt-8 print:mt-10 pt-6 border-t-2 border-gray-300">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-6 print:mb-8 text-center">
                Official Signatures
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 print:gap-6">
                <SigBox label="Platoon Instructor" />
                <SigBox label="Man O'War Instructor" />
                <SigBox label="Camp Commandant" highlight />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Printed: {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} &nbsp;·&nbsp; Corps Member ID: {profile.id} &nbsp;·&nbsp; Batch: {(profile as any).batchId}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">This document is for official NYSC use only · Batch C 2025 Evaluation Committee</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
          .print\\:py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
          .print\\:p-8 { padding: 2rem !important; }
          .print\\:min-h-\\[297mm\\] { min-height: 297mm !important; }
          .print\\:text-xl { font-size: 1.25rem !important; }
          .print\\:text-2xl { font-size: 1.5rem !important; }
          .print\\:text-sm { font-size: 0.875rem !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem !important; }
          .print\\:mt-10 { margin-top: 2.5rem !important; }
          .print\\:mb-8 { margin-bottom: 2rem !important; }
          .print\\:gap-6 { gap: 1.5rem !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
          .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
          .print\\:bg-green-100 { background-color: #dcfce7 !important; }
          .print\\:bg-green-200 { background-color: #bbf7d0 !important; }
          .print\\:bg-blue-100 { background-color: #dbeafe !important; }
          .print\\:bg-yellow-100 { background-color: #fef9c3 !important; }
          .print\\:bg-gray-50 { background-color: #f9fafb !important; }
          .print\\:w-24 { width: 6rem !important; }
          .print\\:h-24 { height: 6rem !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    green: "border-green-600",
    blue: "border-blue-600",
    amber: "border-amber-500",
    purple: "border-purple-600",
  };
  return (
    <div className={`border-l-4 ${colorMap[color] || "border-gray-400"} pl-4`}>
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

function SigBox({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div className={`text-center p-4 rounded-lg border-2 ${highlight ? "border-green-600 bg-green-50 print:bg-green-50" : "border-gray-300"}`}>
      <div className="h-16 print:h-20 mb-3" />
      <div className={`border-t-2 ${highlight ? "border-green-600" : "border-gray-700"} pt-2`}>
        <p className={`font-semibold text-sm ${highlight ? "text-green-800" : "text-gray-800"}`}>{label}</p>
        <p className="text-xs text-gray-400 mt-1">Name: ___________________</p>
        <p className="text-xs text-gray-400 mt-1">Date: ____________________</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg p-8 text-center max-w-md shadow">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        <button onClick={onBack} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Go Back</button>
      </div>
    </div>
  );
}

function formatPhone(phone: string): string {
  if (!phone) return "—";
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 10)} ${phone.slice(10)}`;
}
