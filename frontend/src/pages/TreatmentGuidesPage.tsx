import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, MessageSquare, Search, ShieldCheck, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, TreatmentGuide } from '../services/api';
import { useToast } from '../components/Toast';

const TreatmentGuidesPage = () => {
  const { toast } = useToast();
  const [guides, setGuides] = useState<TreatmentGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedGuide, setSelectedGuide] = useState<TreatmentGuide | null>(null);

  useEffect(() => {
    const fetchGuides = async () => {
      try { setLoading(true); const data = await api.getGuides(); setGuides(data); if (data.length > 0) setSelectedGuide(data[0]); }
      catch (err) { setError('Failed to load treatment guides. Please try again later.'); toast('error', 'Failed to load treatment guides'); }
      finally { setLoading(false); }
    };
    fetchGuides();
  }, []);

  const crops = useMemo(() => {
    if (!guides.length) return ['All'];
    return ['All', ...Array.from(new Set(guides.map((g) => g.crop)))];
  }, [guides]);

  const filteredGuides = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guides.filter((g) => {
      const matchesCrop = selectedCrop === 'All' || g.crop === selectedCrop;
      const searchable = `${g.crop} ${g.disease} ${g.symptoms.join(' ')}`.toLowerCase();
      return matchesCrop && (!q || searchable.includes(q));
    });
  }, [guides, query, selectedCrop]);

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-6 px-6 pt-6 pb-12">
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-8 bg-slate-200 rounded w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-200 rounded-xl w-20" />)}
          </div>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
          <div className="h-40 bg-slate-200" />
          <div className="p-6 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-6 bg-slate-200 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-slate-100 rounded-2xl" />
              <div className="md:col-span-2 space-y-4">
                <div className="h-20 bg-slate-100 rounded-2xl" />
                <div className="h-20 bg-slate-100 rounded-2xl" />
                <div className="h-20 bg-slate-100 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-6xl py-12 mx-auto text-center">
      <div className="mb-2 text-red-600">{error}</div>
      <button onClick={() => window.location.reload()} className="h-12 px-4 text-white bg-slate-900 rounded-xl hover:bg-slate-800 font-medium">Retry</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-6 pt-6 pb-12">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-green-600 uppercase tracking-wider">Treatment Guides</p>
          <h2 className="text-4xl font-semibold text-slate-900">Quick care steps for common plant diseases</h2>
        </div>
        {selectedGuide && (
          <Link to="/chat" state={{ query: `How do I treat ${selectedGuide.crop} ${selectedGuide.disease}?`, crop: selectedGuide.crop, disease: selectedGuide.disease, confidence: 100 }}
            className="h-12 inline-flex items-center gap-2 px-4 bg-green-700 text-white rounded-xl font-medium hover:bg-green-600 transition-all active:scale-[0.98]">
            <MessageSquare size={18} /> Ask AI About This
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
          <div className="p-4 space-y-4 border-b border-slate-200">
            <div className="relative">
              <Search size={18} className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search crop or disease"
                className="w-full py-3 pl-10 pr-4 outline-hidden bg-slate-100 rounded-xl focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              {crops.map((crop) => (
                <button key={crop} onClick={() => setSelectedCrop(crop)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCrop === crop ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                  {crop}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-3 space-y-2">
            {filteredGuides.map((guide) => (
              <button key={`${guide.crop}-${guide.disease}`} onClick={() => setSelectedGuide(guide)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedGuide?.crop === guide.crop && selectedGuide?.disease === guide.disease ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                <span className="text-xs font-bold uppercase text-slate-500">{guide.crop}</span>
                <p className="font-semibold text-slate-900">{guide.disease}</p>
              </button>
            ))}
            {filteredGuides.length === 0 && <div className="p-5 text-center text-slate-500">No guide matches your search yet.</div>}
          </div>
        </aside>

        {selectedGuide && (
          <motion.section key={`${selectedGuide.crop}-${selectedGuide.disease}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
            <div className="p-6 lg:p-8 bg-green-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-green-200">{selectedGuide.crop}</p>
                  <h3 className="text-3xl font-bold text-white">{selectedGuide.disease}</h3>
                </div>
                <div className="p-3 bg-white/10 rounded-xl"><BookOpen size={28} className="text-white" /></div>
              </div>
            </div>
            <div className="p-6 space-y-6 lg:p-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="p-5 border md:col-span-1 bg-amber-50 border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3 font-bold text-amber-600"><AlertTriangle size={18} />Symptoms</div>
                  <ul className="space-y-2 text-slate-600">
                    {selectedGuide.symptoms.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /><span>{s}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-1 gap-4 md:col-span-2">
                  <div className="p-5 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-900"><CheckCircle2 size={18} className="text-green-600" />Immediate Action</div>
                    <p className="leading-relaxed text-slate-500">{selectedGuide.immediateAction}</p>
                  </div>
                  <div className="p-5 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-900"><ShieldCheck size={18} className="text-green-600" />Treatment</div>
                    <p className="leading-relaxed text-slate-500">{selectedGuide.treatment}</p>
                  </div>
                  <div className="p-5 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-900"><ShieldCheck size={18} className="text-green-600" />Prevention</div>
                    <p className="leading-relaxed text-slate-500">{selectedGuide.prevention}</p>
                  </div>
                </div>
              </div>
              <a href={selectedGuide.youtubeLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 p-4 text-red-600 border border-red-100 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
                <span className="flex items-center gap-3 font-bold"><Youtube size={24} />Watch treatment videos</span>
                <span className="text-sm font-bold">Open</span>
              </a>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default TreatmentGuidesPage;
