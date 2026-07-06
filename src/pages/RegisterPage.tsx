import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Upload, Plus, Minus, AlertTriangle, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { NIGERIAN_STATES } from "@/const";

type Institution = {
  institutionName: string;
  startDate: string;
  endDate: string;
};

type FormData = {
  passportPhoto: string;
  surname: string;
  otherNames: string;
  changedName: boolean;
  formerName: string;
  state: "ondo" | "lagos";
  stateCode: string;
  callUpNumber: string;
  phoneNumber: string;
  stateOfOrigin: string;
  stateOfDeployment: "ondo" | "lagos";
  qualification: string;
  areaOfSpecialization: string;
  platoon: number;
  campExperienceComment: string;
  institutions: Institution[];
};

const emptyInstitution: Institution = {
  institutionName: "",
  startDate: "",
  endDate: "",
};

const initialForm: FormData = {
  passportPhoto: "",
  surname: "",
  otherNames: "",
  changedName: false,
  formerName: "",
  state: "ondo",
  stateCode: "",
  callUpNumber: "",
  phoneNumber: "234",
  stateOfOrigin: "",
  stateOfDeployment: "ondo",
  qualification: "",
  areaOfSpecialization: "",
  platoon: 1,
  campExperienceComment: "",
  institutions: [{ ...emptyInstitution }],
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: activeBatch } = trpc.batches.getActive.useQuery();

  const registerMutation = trpc.corpsMembers.register.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setStep(4);
    },
    onError: (err) => {
      setErrors({ submit: err.message });
    },
  });

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // Max 160px — enough for a passport photo, keeps DB small
          const MAX_SIZE = 160;
          const TARGET_BYTES = 12 * 1024; // 12KB hard target
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > MAX_SIZE) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
          } else {
            if (h > MAX_SIZE) { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);

          // Start at quality 0.5, step down until under target
          let quality = 0.5;
          let compressed = canvas.toDataURL("image/jpeg", quality);
          while (compressed.length * 0.75 > TARGET_BYTES && quality > 0.1) {
            quality = Math.round((quality - 0.05) * 100) / 100;
            compressed = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(compressed);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, passportPhoto: "File too large (max 5MB)" });
      return;
    }
    const compressed = await compressImage(file);
    setForm({ ...form, passportPhoto: compressed });
    setErrors({ ...errors, passportPhoto: "" });
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.surname.trim()) newErrors.surname = "Surname is required";
    if (!form.otherNames.trim()) newErrors.otherNames = "Other names are required";
    if (!form.stateCode.match(/^(OD|LA)\/\d{2}[A-C]\/[0-9]{4}$/i)) {
      newErrors.stateCode = "Format: OD/YYB/XXXX or LA/YYC/XXXX (e.g., OD/25C/0001)";
    }
    if (!form.callUpNumber.match(/^NYSC\/[A-Z]{2,4}\/\d{4}\/[0-9]{5,6}$/i)) {
      newErrors.callUpNumber = "Format: NYSC/XXX/YYYY/XXXXX or XXXXXX (e.g., NYSC/OND/2025/00001)";
    }
    if (!form.phoneNumber.match(/^234[0-9]{10}$/)) {
      newErrors.phoneNumber = "Must start with 234 and be 13 digits total";
    }
    if (!form.stateOfOrigin) newErrors.stateOfOrigin = "Required";
    if (!form.qualification.trim()) newErrors.qualification = "Required";
    if (!form.areaOfSpecialization.trim()) newErrors.areaOfSpecialization = "Required";

    // Validate institutions
    form.institutions.forEach((inst, i) => {
      if (!inst.institutionName.trim()) newErrors[`inst_${i}_name`] = "Required";
      if (!inst.startDate) newErrors[`inst_${i}_start`] = "Required";
      if (!inst.endDate) newErrors[`inst_${i}_end`] = "Required";
      if (inst.startDate && inst.endDate && new Date(inst.startDate) >= new Date(inst.endDate)) {
        newErrors[`inst_${i}_end`] = "Must be after start date";
      }
      if (inst.endDate && new Date(inst.endDate) > new Date()) {
        newErrors[`inst_${i}_end`] = "Cannot be in the future";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(step + 1);
  };

  const handleSubmit = () => {
    if (!activeBatch) {
      setErrors({ submit: "No active batch found" });
      return;
    }

    registerMutation.mutate({
      passportPhoto: form.passportPhoto || undefined,
      surname: form.surname.toUpperCase(),
      otherNames: form.otherNames.toUpperCase(),
      changedName: form.changedName ? 1 : 0,
      formerName: form.changedName ? form.formerName : undefined,
      state: form.state,
      stateCode: form.stateCode.toUpperCase(),
      callUpNumber: form.callUpNumber.toUpperCase(),
      phoneNumber: form.phoneNumber,
      stateOfOrigin: form.stateOfOrigin,
      stateOfDeployment: form.stateOfDeployment,
      qualification: form.qualification,
      areaOfSpecialization: form.areaOfSpecialization,
      platoon: form.platoon,
      campExperienceComment: form.campExperienceComment || undefined,
      institutions: form.institutions.map((i) => ({
        institutionName: i.institutionName,
        startDate: i.startDate,
        endDate: i.endDate,
      })),
    });
  };

  const addInstitution = () => {
    setForm({ ...form, institutions: [...form.institutions, { ...emptyInstitution }] });
  };

  const removeInstitution = (index: number) => {
    if (form.institutions.length <= 1) return;
    setForm({
      ...form,
      institutions: form.institutions.filter((_, i) => i !== index),
    });
  };

  const updateForm = (field: keyof FormData, value: any) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const updateInstitution = (index: number, field: keyof Institution, value: string) => {
    const newInsts = [...form.institutions];
    newInsts[index] = { ...newInsts[index], [field]: value };
    setForm({ ...form, institutions: newInsts });
    setErrors({ ...errors, [`inst_${index}_${field === "institutionName" ? "name" : field === "startDate" ? "start" : "end"}`]: "" });
  };

  if (!activeBatch && step < 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Batch</h2>
          <p className="text-gray-500 mb-4">Registration is currently closed. Please check back later.</p>
          <button onClick={() => navigate("/")} className="text-green-600 font-medium hover:underline">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  s === step ? "bg-green-600 w-6" : s < step ? "bg-green-400" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Corps Member Registration</h1>
              <p className="text-gray-500 mb-6">Fill in your details carefully</p>

              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.submit}
                </div>
              )}

              <div className="space-y-5">
                {/* Passport Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passport Photo</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {form.passportPhoto ? (
                      <img src={form.passportPhoto} alt="Preview" className="w-20 h-20 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border">
                        <UserPlus className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  </div>
                  {errors.passportPhoto && <p className="text-red-500 text-xs mt-1">{errors.passportPhoto}</p>}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
                    <input
                      type="text"
                      value={form.surname}
                      onChange={(e) => updateForm("surname", e.target.value.toUpperCase())}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.surname ? "border-red-300" : "border-gray-300"}`}
                      placeholder="SURNAME"
                    />
                    {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Names *</label>
                    <input
                      type="text"
                      value={form.otherNames}
                      onChange={(e) => updateForm("otherNames", e.target.value.toUpperCase())}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.otherNames ? "border-red-300" : "border-gray-300"}`}
                      placeholder="OTHER NAMES"
                    />
                    {errors.otherNames && <p className="text-red-500 text-xs mt-1">{errors.otherNames}</p>}
                  </div>
                </div>

                {/* Changed Name */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.changedName}
                    onChange={(e) => updateForm("changedName", e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    id="changedName"
                  />
                  <label htmlFor="changedName" className="text-sm text-gray-700">I changed my name</label>
                </div>
                {form.changedName && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Former Name</label>
                    <input
                      type="text"
                      value={form.formerName}
                      onChange={(e) => updateForm("formerName", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Former name"
                    />
                  </motion.div>
                )}

                {/* State and State Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State (NYSC) *</label>
                    <select
                      value={form.state}
                      onChange={(e) => updateForm("state", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="ondo">Ondo</option>
                      <option value="lagos">Lagos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State Code *</label>
                    <input
                      type="text"
                      value={form.stateCode}
                      onChange={(e) => updateForm("stateCode", e.target.value.toUpperCase())}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.stateCode ? "border-red-300" : "border-gray-300"}`}
                      placeholder="OD/25C/0001"
                    />
                    {errors.stateCode && <p className="text-red-500 text-xs mt-1">{errors.stateCode}</p>}
                  </div>
                </div>

                {/* Call-up and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Call-up Number *</label>
                    <input
                      type="text"
                      value={form.callUpNumber}
                      onChange={(e) => updateForm("callUpNumber", e.target.value.toUpperCase())}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.callUpNumber ? "border-red-300" : "border-gray-300"}`}
                      placeholder="NYSC/OND/2025/00001"
                    />
                    {errors.callUpNumber && <p className="text-red-500 text-xs mt-1">{errors.callUpNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      value={form.phoneNumber}
                      onChange={(e) => updateForm("phoneNumber", e.target.value.replace(/\D/g, ""))}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.phoneNumber ? "border-red-300" : "border-gray-300"}`}
                      placeholder="2348012345678"
                    />
                    {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                  </div>
                </div>

                {/* Origin and Deployment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State of Origin *</label>
                    <select
                      value={form.stateOfOrigin}
                      onChange={(e) => updateForm("stateOfOrigin", e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.stateOfOrigin ? "border-red-300" : "border-gray-300"}`}
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.stateOfOrigin && <p className="text-red-500 text-xs mt-1">{errors.stateOfOrigin}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State of Deployment *</label>
                    <select
                      value={form.stateOfDeployment}
                      onChange={(e) => updateForm("stateOfDeployment", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="ondo">Ondo</option>
                      <option value="lagos">Lagos</option>
                    </select>
                  </div>
                </div>

                {/* Qualification and Specialization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualification *</label>
                    <input
                      type="text"
                      value={form.qualification}
                      onChange={(e) => updateForm("qualification", e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.qualification ? "border-red-300" : "border-gray-300"}`}
                      placeholder="B.Sc, HND, etc."
                    />
                    {errors.qualification && <p className="text-red-500 text-xs mt-1">{errors.qualification}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area of Specialization *</label>
                    <input
                      type="text"
                      value={form.areaOfSpecialization}
                      onChange={(e) => updateForm("areaOfSpecialization", e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${errors.areaOfSpecialization ? "border-red-300" : "border-gray-300"}`}
                      placeholder="Computer Science"
                    />
                    {errors.areaOfSpecialization && <p className="text-red-500 text-xs mt-1">{errors.areaOfSpecialization}</p>}
                  </div>
                </div>

                {/* Platoon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platoon *</label>
                  <select
                    value={form.platoon}
                    onChange={(e) => updateForm("platoon", parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Platoon {i + 1}</option>
                    ))}
                  </select>
                </div>

                {/* Camp Experience Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camp Experience Comment</label>
                  <textarea
                    value={form.campExperienceComment}
                    onChange={(e) => updateForm("campExperienceComment", e.target.value.slice(0, 1000))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                    placeholder="Share your camp experience (optional, max 1000 chars)"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.campExperienceComment.length}/1000</p>
                </div>

                {/* Higher Institutions */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <label className="text-sm font-medium text-gray-700">Higher Institutions *</label>
                    <button
                      type="button"
                      onClick={addInstitution}
                      className="flex w-fit items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.institutions.map((inst, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 relative">
                        {form.institutions.length > 1 && (
                          <button
                            onClick={() => removeInstitution(index)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="text"
                            value={inst.institutionName}
                            onChange={(e) => updateInstitution(index, "institutionName", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-green-500 text-sm ${errors[`inst_${index}_name`] ? "border-red-300" : "border-gray-300"}`}
                            placeholder="Institution Name"
                          />
                          {errors[`inst_${index}_name`] && <p className="text-red-500 text-xs">{errors[`inst_${index}_name`]}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={inst.startDate}
                                onChange={(e) => updateInstitution(index, "startDate", e.target.value)}
                                className={`w-full min-w-0 px-3 py-2 border rounded-md bg-white outline-none focus:ring-2 focus:ring-green-500 text-sm ${errors[`inst_${index}_start`] ? "border-red-300" : "border-gray-300"}`}
                                aria-label="Institution start date"
                              />
                              {errors[`inst_${index}_start`] && <p className="text-red-500 text-xs">{errors[`inst_${index}_start`]}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                              <input
                                type="date"
                                value={inst.endDate}
                                onChange={(e) => updateInstitution(index, "endDate", e.target.value)}
                                className={`w-full min-w-0 px-3 py-2 border rounded-md bg-white outline-none focus:ring-2 focus:ring-green-500 text-sm ${errors[`inst_${index}_end`] ? "border-red-300" : "border-gray-300"}`}
                                aria-label="Institution end date"
                              />
                              {errors[`inst_${index}_end`] && <p className="text-red-500 text-xs">{errors[`inst_${index}_end`]}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                Continue to Preview
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Preview</h1>
              <p className="text-gray-500 mb-6">Review your information</p>

              <div className="space-y-4">
                {form.passportPhoto && (
                  <div className="flex justify-center">
                    <img src={form.passportPhoto} alt="Passport" className="w-24 h-24 rounded-lg object-cover border" />
                  </div>
                )}

                <PreviewSection title="Personal Information">
                  <PreviewItem label="Surname" value={form.surname} />
                  <PreviewItem label="Other Names" value={form.otherNames} />
                  {form.changedName && <PreviewItem label="Former Name" value={form.formerName} />}
                  <PreviewItem label="State Code" value={form.stateCode.toUpperCase()} />
                  <PreviewItem label="Call-up Number" value={form.callUpNumber.toUpperCase()} />
                  <PreviewItem label="Phone" value={form.phoneNumber} />
                  <PreviewItem label="State of Origin" value={form.stateOfOrigin} />
                  <PreviewItem label="State of Deployment" value={form.stateOfDeployment} />
                </PreviewSection>

                <PreviewSection title="Education & Platoon">
                  <PreviewItem label="Qualification" value={form.qualification} />
                  <PreviewItem label="Specialization" value={form.areaOfSpecialization} />
                  <PreviewItem label="Platoon" value={`Platoon ${form.platoon}`} />
                </PreviewSection>

                <PreviewSection title="Higher Institutions">
                  {form.institutions.map((inst, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium">{inst.institutionName}</p>
                      <p className="text-gray-500">{inst.startDate} to {inst.endDate}</p>
                    </div>
                  ))}
                </PreviewSection>

                {form.campExperienceComment && (
                  <PreviewSection title="Camp Experience">
                    <p className="text-sm text-gray-700">{form.campExperienceComment}</p>
                  </PreviewSection>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Edit
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8"
            >
              <div className="text-center mb-6">
                <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Confirm Submission</h1>
                <p className="text-gray-500 mt-2">
                  Please note that this form can only be submitted once. Verify all your information before proceeding.
                </p>
              </div>

              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.submit}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {form.surname} {form.otherNames}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">State Code:</span> {form.stateCode.toUpperCase()}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Platoon:</span> {form.platoon}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {registerMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Submit Form
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && submitted && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-green-600" />
              </motion.div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h1>
              <p className="text-gray-500 mb-6">
                Your details have been submitted successfully. Your camp officials will review your information.
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">State Code: {form.stateCode.toUpperCase()}</p>
                <p className="text-green-700 text-sm mt-1">Save this for your reference</p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Return to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-2 text-sm">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 break-words sm:text-right">{value || "-"}</span>
    </div>
  );
}
