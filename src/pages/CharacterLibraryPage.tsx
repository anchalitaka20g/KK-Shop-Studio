import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Sparkles,
  ShieldCheck,
  Plus,
  Image as ImageIcon,
  Edit2,
  Save,
  Mic,
  Shirt,
  Eye,
  FileCode,
  Check,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';
import { Character } from '../types';
import { api } from '../services/api';

export const CharacterLibraryPage: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Character>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const data = await api.getCharacters();
      setCharacters(data);
      if (data.length > 0) {
        setSelectedChar(data[0]);
        setEditForm(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (c: Character) => {
    setSelectedChar(c);
    setEditForm(c);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editForm.name) return;
    try {
      const saved = await api.saveCharacter(editForm);
      setSelectedChar(saved);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadCharacters();
    } catch (err: any) {
      console.error(`บันทึกไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              คลังตัวละครประจำร้าน (Character Reference System)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              เจ๊อ๋อย KK Shop Mama
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            กำหนดกฎอัตลักษณ์ เสื้อผ้า ทรงผม น้ำเสียงภาษาไทย และ Prompt ตายตัว เพื่อให้ AI สานต่อบุคลิกตัวละครเดิมเสมอ
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>บันทึกข้อมูลตัวละครสำเร็จ!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Character List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            รายชื่อตัวละครในระบบ ({characters.length})
          </div>

          {characters.map((c) => {
            const isSel = selectedChar?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-4 ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xl shadow-amber-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="h-14 w-14 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
                  {c.referenceImages && c.referenceImages.length > 0 ? (
                    <img
                      src={c.referenceImages[0]}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className={`h-7 w-7 ${isSel ? 'text-slate-950' : 'text-slate-500'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm truncate">{c.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        c.referenceImages && c.referenceImages.length > 0
                          ? isSel ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
                          : isSel ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {c.status || (c.referenceImages?.length > 0 ? 'READY' : 'REFERENCE_REQUIRED')}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isSel ? 'text-slate-900/80 font-medium' : 'text-slate-400'}`}>
                    {c.role}
                  </p>
                  <p className={`text-[10px] mt-1 font-mono ${isSel ? 'text-slate-900/70' : 'text-slate-500'}`}>
                    ID: {c.id}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Character Details & Rules Editor */}
        <div className="lg:col-span-8 space-y-4">
          {selectedChar && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-bold text-white">{selectedChar.name}</h4>
                  <span className="text-xs text-amber-400 font-medium">({selectedChar.role})</span>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>แก้ไขกฎตัวละคร</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Reference Images Gallery */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                  <span>ภาพอ้างอิงใบหน้าและสไตล์ (Reference Images)</span>
                </span>
                {selectedChar.referenceImages && selectedChar.referenceImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedChar.referenceImages.map((img, i) => (
                      <div key={i} className="h-32 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 relative group">
                        <img src={img} alt="Reference" className="h-full w-full object-cover" />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-400">
                          Ref #{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-950 border border-dashed border-amber-500/30 text-center space-y-2">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                    <p className="text-sm font-bold text-amber-300">ยังไม่มีรูปอ้างอิงจริง</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      สถานะ: REFERENCE_REQUIRED — ระบบจะไม่สร้างใบหน้าจำลองหรือใช้รูปแทน จนกว่าจะเลือกภาพถ่ายอ้างอิงจริงของเจ๊อ๋อย
                    </p>
                  </div>
                )}
              </div>

              {/* Character Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Clothing Rules */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Shirt className="h-4 w-4" />
                    <span>กฎการแต่งกาย (Clothing Rules)</span>
                  </span>
                  {!isEditing ? (
                    <p className="text-slate-300 leading-relaxed">{selectedChar.clothingRules}</p>
                  ) : (
                    <textarea
                      rows={3}
                      value={editForm.clothingRules || ''}
                      onChange={(e) => setEditForm({ ...editForm, clothingRules: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  )}
                </div>

                {/* Voice Rules */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Mic className="h-4 w-4" />
                    <span>กฎน้ำเสียงและภาษา (Voice Rules - THAI ONLY)</span>
                  </span>
                  {!isEditing ? (
                    <p className="text-slate-300 leading-relaxed">{selectedChar.voiceRules}</p>
                  ) : (
                    <textarea
                      rows={3}
                      value={editForm.voiceRules || ''}
                      onChange={(e) => setEditForm({ ...editForm, voiceRules: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  )}
                </div>

                {/* Visual Rules */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>กฎลักษณะท่าทางและแววตา (Visual Rules)</span>
                  </span>
                  {!isEditing ? (
                    <p className="text-slate-300 leading-relaxed">{selectedChar.visualRules}</p>
                  ) : (
                    <textarea
                      rows={3}
                      value={editForm.visualRules || ''}
                      onChange={(e) => setEditForm({ ...editForm, visualRules: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  )}
                </div>

                {/* Prompt Rules */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <FileCode className="h-4 w-4" />
                    <span>กฎ Prompt บังคับ (Base Prompt Rules)</span>
                  </span>
                  {!isEditing ? (
                    <p className="text-slate-400 font-mono text-[11px] leading-relaxed">{selectedChar.promptRules}</p>
                  ) : (
                    <textarea
                      rows={3}
                      value={editForm.promptRules || ''}
                      onChange={(e) => setEditForm({ ...editForm, promptRules: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
