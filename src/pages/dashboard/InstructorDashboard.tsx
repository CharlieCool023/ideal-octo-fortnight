import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  Users, ClipboardList, Printer, Search, ArrowLeft, CheckCircle, Check,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/providers/trpc";
import { EVALUATION_CATEGORIES, SCORE_LABELS } from "@/const";
import { useScrollPosition } from "@/hooks/useScrollPosition";

type Tab = "dashboard" | "platoon" | "evaluations" | "print";

export default function InstructorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "dashboard") as Tab;
  const setTab = (t: Tab) => setSearchParams({ tab: t });

  return (
    <DashboardLayout requiredRole="platoon_instructor" title={tab === "dashboard" ? "Platoon Instructor" : tab.charAt(0).toUpperCase() + tab.slice(1)}>
      {tab === "dashboard" && <DashboardOverview onNavigate={setTab} />}
      {tab === "platoon" && <PlatoonTab />}
      {tab === "evaluations" && <PlatoonTab />}
      {tab === "print" && <PrintTab />}
    </DashboardLayout>
  );
}

function DashboardOverview({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: stats } = trpc.stats.dashboard.useQuery();

  const cards = [
    { label: "Total Members", value: stats?.totalMembers || 0, icon: <Users className="w-6 h-6" />, color: "bg-blue-500", tab: "platoon" as Tab },
    { label: "Evaluated", value: stats?.processedCount || 0, icon: <CheckCircle className="w-6 h-6" />, color: "bg-green-500", tab: "evaluations" as Tab },
    { label: "Pending", value: stats?.pendingCount || 0, icon: <ClipboardList className="w-6 h-6" />, color: "bg-amber-500", tab: "platoon" as Tab },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.button
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(card.tab)}
            className="bg-white rounded-xl p-6 shadow-sm border text-left hover:shadow-md transition-shadow"
          >
            <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>{card.icon}</div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function PlatoonTab() {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const scrollContainerRef = useScrollPosition({ key: "instructor-platoon-list" });

  const { data: members, refetch } = trpc.corpsMembers.list.useQuery({
    search: search || undefined,
  });

  const { data: existingEval } = trpc.evaluations.get.useQuery(
    { corpsMemberId: selectedMember! },
    { enabled: !!selectedMember }
  );

  if (selectedMember) {
    const selectedMemberData = members?.find((m) => m.id === selectedMember);

    return (
      <EvaluationForm
        corpsMemberId={selectedMember}
        member={selectedMemberData}
        existingEval={existingEval}
        onBack={() => { setSelectedMember(null); refetch(); }}
        evaluatorRole="platoon_instructor"
      />
    );
  }

  return (
    <div className="space-y-4 flex flex-col max-h-[calc(100vh-200px)]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {members?.map((m) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedMember(m.id)}
              className="bg-white rounded-xl p-4 shadow-sm border text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{m.surname} {m.otherNames}</p>
                  <p className="text-sm text-gray-500">{m.stateCode}</p>
                  <p className="text-sm text-gray-500">Platoon {m.platoon}</p>
                </div>
                {m.evaluationStatus.platoonInstructor ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Evaluated</span>
                ) : (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Pending</span>
                )}
              </div>
              {m.evaluationStatus.piScore && (
                <p className="mt-2 text-sm font-medium text-green-600">Score: {m.evaluationStatus.piScore}</p>
              )}
            </motion.button>
          )) || <p className="text-gray-400 text-center py-8 col-span-full">No members found</p>}
        </div>
      </div>
    </div>
  );
}

function EvaluationForm({
  corpsMemberId,
  member,
  existingEval,
  onBack,
  evaluatorRole,
}: {
  corpsMemberId: number;
  member?: { surname: string; otherNames: string; stateCode: string; platoon: number };
  existingEval: any;
  onBack: () => void;
  evaluatorRole: string;
}) {
  const utils = trpc.useUtils();
  const [showSuccess, setShowSuccess] = useState(false);
  const submitEval = evaluatorRole === "man_o_war_instructor"
    ? trpc.manOwarEvaluations.submit.useMutation({
        onSuccess: () => {
          utils.manOwarEvaluations.get.invalidate();
          setShowSuccess(true);
          window.setTimeout(onBack, 1500);
        },
      })
    : trpc.evaluations.submit.useMutation({
        onSuccess: () => {
          utils.evaluations.get.invalidate();
          setShowSuccess(true);
          window.setTimeout(onBack, 1500);
        },
      });

  const defaultScores = {
    leadershipInitiative: existingEval?.leadershipInitiative || 6,
    professionalBearing: existingEval?.professionalBearing || 6,
    physicalFitness: existingEval?.physicalFitness || 6,
    communicationSkills: existingEval?.communicationSkills || 6,
    technicalCompetence: existingEval?.technicalCompetence || 6,
    teamworkCooperation: existingEval?.teamworkCooperation || 6,
    reliabilityDependability: existingEval?.reliabilityDependability || 6,
    respectDignityRights: existingEval?.respectDignityRights || 6,
  };
  const [scores, setScores] = useState<Record<string, number>>(defaultScores);

  // Sync scores when existingEval loads (it may load after initial render)
  useEffect(() => {
    if (existingEval) {
      setScores({
        leadershipInitiative: existingEval.leadershipInitiative,
        professionalBearing: existingEval.professionalBearing,
        physicalFitness: existingEval.physicalFitness,
        communicationSkills: existingEval.communicationSkills,
        technicalCompetence: existingEval.technicalCompetence,
        teamworkCooperation: existingEval.teamworkCooperation,
        reliabilityDependability: existingEval.reliabilityDependability,
        respectDignityRights: existingEval.respectDignityRights,
      });
    }
  }, [existingEval]);

  const overallAverage = (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1);

  const handleSubmit = () => {
    submitEval.mutate({
      corpsMemberId,
      leadershipInitiative: scores.leadershipInitiative,
      professionalBearing: scores.professionalBearing,
      physicalFitness: scores.physicalFitness,
      communicationSkills: scores.communicationSkills,
      technicalCompetence: scores.technicalCompetence,
      teamworkCooperation: scores.teamworkCooperation,
      reliabilityDependability: scores.reliabilityDependability,
      respectDignityRights: scores.respectDignityRights,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {showSuccess && (
        <SuccessPopup
          title={`${member ? `${member.surname} ${member.otherNames}` : "Corps member"} evaluated`}
          message="Evaluation saved successfully. Returning to the list..."
        />
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to list
      </button>

      {member && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{member.surname} {member.otherNames}</h2>
          <p className="text-sm text-gray-500">{member.stateCode} | Platoon {member.platoon}</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{evaluatorRole === "man_o_war_instructor" ? "Man O'War" : "Platoon Instructor"} Evaluation</h3>
        {existingEval && <p className="text-green-600 text-sm mb-4 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Previously evaluated. You can update the scores.</p>}

        <div className="space-y-6">
          {EVALUATION_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mb-2">
                <label className="text-sm font-medium text-gray-700">{cat.label}</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600 w-8 text-right">{scores[cat.key]}</span>
                  <span className="text-xs text-gray-500 w-16 text-right">{SCORE_LABELS[scores[cat.key]]}</span>
                </div>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={2}
                value={scores[cat.key]}
                onChange={(e) => setScores({ ...scores, [cat.key]: parseInt(e.target.value) })}
                className="w-full accent-green-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Poor (2)</span>
                <span>Excellent (10)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Overall */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
            <span className="font-semibold text-gray-800">Overall Average Score</span>
            <span className="text-3xl font-bold text-green-600">{overallAverage}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitEval.isPending}
          className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {submitEval.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              {existingEval ? "Update Evaluation" : "Submit Evaluation"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SuccessPopup({ title, message }: { title: string; message: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

function PrintTab() {
  const { data: activeBatch } = trpc.batches.getActive.useQuery();
  const platoon = 1;

  const { data: report } = trpc.export.platoonReport.useQuery(
    { platoon },
    { enabled: !!activeBatch }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        {!activeBatch && <div className="text-amber-600 font-semibold">No active batch available</div>}
        {activeBatch && <div className="text-gray-600 font-semibold">Batch: {activeBatch.name}</div>}
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {report && (
        <div className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Platoon {platoon} Evaluation Summary</h2>
            <p className="text-gray-500">{activeBatch && activeBatch.name}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State Code</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PI Score</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOW Score</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {report.map((m, i) => (
                  <tr key={m.id}><td className="px-4 py-3 text-sm">{i + 1}</td><td className="px-4 py-3 text-sm font-medium">{m.surname} {m.otherNames}</td><td className="px-4 py-3 text-sm">{m.stateCode}</td><td className="px-4 py-3 text-sm">{m.piScore || "-"}</td><td className="px-4 py-3 text-sm">{m.mowScore || "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
