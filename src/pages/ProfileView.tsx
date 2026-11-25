import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { EVALUATION_CATEGORIES } from "@/const";

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = id ? parseInt(id, 10) : null;
  const { data: profile, isLoading, error } = trpc.corpsMembers.get.useQuery(
    { id: memberId! },
    { enabled: !!memberId }
  );

  if (!memberId) return <ErrorState message="No profile ID provided" onBack={() => navigate(-1)} />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" /></div>;
  if (error || !profile) return <ErrorState message="The requested profile could not be found" onBack={() => navigate(-1)} />;

  const piEval = profile.evaluations?.platoonInstructor;
  const mowEval = profile.evaluations?.manOWar;
  const finalScore = piEval && mowEval
    ? ((Number(piEval.overallAverage) + Number(mowEval.overallAverage)) / 2).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-white">
      <div className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Back</button>
          <p className="text-sm font-semibold text-slate-800 truncate">{profile.surname} {profile.otherNames}</p>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"><Printer className="w-4 h-4" /> Print profile</button>
        </div>
      </div>

      <article className="profile-document mx-auto my-6 max-w-4xl bg-white px-6 py-6 shadow-sm print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-center justify-between gap-5 border-b-2 border-green-800 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-800">NYSC · Camp Evaluation</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Corps Member Profile</h1>
            <p className="mt-1 text-xs text-slate-500">Official individual evaluation record</p>
          </div>
          {profile.passportPhoto && <img src={profile.passportPhoto} alt="Corps member" className="h-[76px] w-[64px] rounded-md border border-slate-200 object-cover print:h-[66px] print:w-[56px]" />}
        </header>

        <section className="profile-block mt-4 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-slate-900">{profile.surname} {profile.otherNames}</h2>
            <p className="mt-1 text-sm text-slate-600">{profile.stateCode} <span className="px-1 text-slate-300">·</span> {profile.callUpNumber}</p>
          </div>
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Platoon {profile.platoon}</p>
        </section>

        <section className="profile-block mt-4">
          <SectionTitle>Personal details</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 print:grid-cols-4 print:gap-y-2">
            <Field label="Phone" value={formatPhone(profile.phoneNumber)} />
            <Field label="State of origin" value={profile.stateOfOrigin} />
            <Field label="State of deployment" value={profile.stateOfDeployment} />
            <Field label="Qualification" value={profile.qualification} />
            <Field label="Specialization" value={profile.areaOfSpecialization} />
            {profile.changedName ? <Field label="Former name" value={profile.formerName || "—"} /> : null}
          </div>
        </section>

        {profile.institutions?.length > 0 && (
          <section className="profile-block mt-4">
            <SectionTitle>Education</SectionTitle>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 print:grid-cols-2">
              {profile.institutions.map((inst, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-slate-100 py-1 text-xs">
                  <span className="font-medium text-slate-800">{inst.institutionName}</span>
                  <span className="shrink-0 text-slate-500">{new Date(inst.startDate).getFullYear()}–{new Date(inst.endDate).getFullYear()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(piEval || mowEval) && (
          <section className="profile-block mt-4">
            <SectionTitle>Evaluation scores</SectionTitle>
            <table className="w-full border-collapse text-xs">
              <thead><tr className="border-y border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500"><th className="py-1.5 pr-3 font-semibold">Criteria</th><th className="px-2 py-1.5 text-center font-semibold">Platoon instructor</th><th className="px-2 py-1.5 text-center font-semibold">Man O’War</th></tr></thead>
              <tbody>
                {EVALUATION_CATEGORIES.map((cat) => (
                  <tr key={cat.key} className="border-b border-slate-100">
                    <td className="py-1 pr-3 text-slate-700">{cat.label}</td>
                    <td className="px-2 py-1 text-center font-medium text-slate-800">{piEval ? `${piEval[cat.key]}/10` : "—"}</td>
                    <td className="px-2 py-1 text-center font-medium text-slate-800">{mowEval ? `${mowEval[cat.key]}/10` : "—"}</td>
                  </tr>
                ))}
                <tr className="border-b border-slate-300 font-semibold"><td className="py-1.5 pr-3 text-slate-900">Overall average</td><td className="px-2 py-1.5 text-center">{piEval?.overallAverage ?? "—"}</td><td className="px-2 py-1.5 text-center">{mowEval?.overallAverage ?? "—"}</td></tr>
                {finalScore && <tr className="font-bold"><td className="py-1.5 pr-3 text-green-900">Combined score</td><td colSpan={2} className="px-2 py-1.5 text-center text-green-900">{finalScore}</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {(profile.comments?.length > 0 || profile.commandantComments?.length > 0) && (
          <section className="profile-block profile-long-content mt-4">
            <SectionTitle>Remarks</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
              {profile.comments?.length > 0 && <RemarkGroup title="Corps member comments" comments={profile.comments} />}
              {profile.commandantComments?.length > 0 && <RemarkGroup title="Commandant remarks" comments={profile.commandantComments} />}
            </div>
          </section>
        )}

        <footer className="profile-block mt-5 border-t border-slate-300 pt-3">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Approvals</p>
          <div className="grid grid-cols-3 gap-5">
            {["Platoon Instructor", "Man O’War Instructor", "Camp Commandant"].map((label) => (
              <div key={label} className="border-t border-slate-500 pt-1.5 text-[10px] text-slate-600">{label}<span className="float-right text-slate-400">Date: ________</span></div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-2 text-[9px] text-slate-400">
            <span>Printed {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>Record #{profile.id} · Batch {profile.batchId}</span>
          </div>
        </footer>
      </article>
      <style>{`@media print { @page { size: A4; margin: 10mm; } html, body, #root { background: #fff !important; } .profile-document { color: #111827 !important; font-size: 9pt !important; } .profile-block:not(.profile-long-content) { break-inside: avoid; page-break-inside: avoid; } img { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 border-l-2 border-green-800 pl-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">{children}</h3>;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 break-words text-xs font-medium text-slate-800">{value || "—"}</p></div>;
}

function RemarkGroup({ title, comments }: { title: string; comments: { comment: string }[] }) {
  return <div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{title}</p><div className="space-y-1">{comments.map((item, i) => <p key={i} className="break-words text-[10px] leading-snug text-slate-700">{item.comment}</p>)}</div></div>;
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><div className="max-w-md rounded-lg bg-white p-8 text-center shadow"><AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" /><h1 className="mb-2 text-xl font-bold text-gray-800">Profile not found</h1><p className="mb-4 text-gray-600">{message}</p><button onClick={onBack} className="rounded-lg bg-green-800 px-4 py-2 text-white hover:bg-green-900">Go back</button></div></div>;
}

function formatPhone(phone: string): string {
  if (!phone) return "—";
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 10)} ${phone.slice(10)}`;
}
