import { useState, useEffect } from 'react';

// --- YOUR CUSTOM TOOLS (Renamed) ---
import ImageEditor from './components/manya-image-editor';
import ThreeDHotspotter from './components/manya-3D-Hotspotter';
import ImageHotspotter from './components/manya-image-hotspotter';
import CurriculumManager from './components/manya-curriculum-editor';
import AssetManager from './components/manya-asset-manager';
import CodeStudio from './components/manya-code-editor';

import { 
  LayoutGrid, Database, Box, Image as ImageIcon, Scissors, BookOpen,
  RefreshCw, Search, Edit3, Cloud, Save, X, Plus, Trash2, FolderOpen,
  ChevronRight, ChevronLeft, Sidebar, FileSpreadsheet, Settings, Code, 
  CheckCircle, AlertTriangle, Filter, Lock, User, LogOut 
} from 'lucide-react';

// ==========================================
// 1. HELPER COMPONENTS
// ==========================================

// Smart Field for JSON Editing
const SmartField = ({ label, value, onChange }) => {
    const isJson = typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['));
    const isLong = typeof value === 'string' && value.length > 50;
    const [jsonError, setJsonError] = useState(null);

    const formatJson = () => {
        try {
            const obj = JSON.parse(value);
            onChange(JSON.stringify(obj, null, 4));
            setJsonError(null);
        } catch (e) { setJsonError("Invalid JSON"); }
    };

    return (
        <div className={`flex flex-col gap-1 ${(isJson || isLong) ? 'col-span-2' : 'col-span-1'}`}>
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                {isJson && (
                    <div className="flex items-center gap-2">
                         {jsonError && <span className="text-[10px] text-red-500 flex items-center gap-1"><AlertTriangle size={10}/> {jsonError}</span>}
                         <button onClick={formatJson} className="text-[10px] text-blue-400 hover:text-white flex items-center gap-1 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/30"><Code size={10}/> FORMAT</button>
                    </div>
                )}
            </div>
            {isJson ? (
                <textarea 
                    value={value} onChange={(e) => onChange(e.target.value)}
                    className={`w-full bg-[#0f172a] border ${jsonError ? 'border-red-500' : 'border-purple-500/50'} rounded-lg p-3 text-xs text-green-400 font-mono h-40 focus:outline-none focus:border-purple-400`}
                    spellCheck="false"
                />
            ) : isLong ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none h-24"/>
            ) : (
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"/>
            )}
        </div>
    );
};

// Login Screen
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('http://localhost:3001/api/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if(data.success) onLogin(data.user);
        else setError("Invalid credentials");
    } catch(e) { setError("Server offline. Check console."); }
  };

  return (
    <div className="h-screen bg-[#020617] flex items-center justify-center font-sans">
        <div className="w-96 bg-[#1e293b] border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-8">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20"><Lock className="text-white" size={24}/></div>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-1">MANYA<span className="text-purple-500">.STUDIO</span></h1>
                <p className="text-slate-400 text-sm">Secure Environment</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input autoFocus type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"/>
                <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"/>
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2">LOGIN</button>
            </form>
            <div className="mt-6 text-center text-[10px] text-slate-600 font-mono">Default: admin / 123</div>
        </div>
    </div>
  );
};

// Dashboard
const DashboardHome = ({ user }) => (
  <div className="p-10 text-white h-full flex flex-col items-center justify-center text-center animate-in fade-in">
    <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/50">
        <span className="text-4xl font-black">M</span>
    </div>
    <h1 className="text-5xl font-black mb-4 tracking-tighter">Welcome, {user.name}</h1>
    <p className="text-slate-400 text-xl max-w-lg">You have <strong className="text-white">{user.role}</strong> access. Select a tool from the sidebar to manage P7 content.</p>
  </div>
);

// ==========================================
// 2. QUESTION BANK COMPONENT
// ==========================================
const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sidebar State
  const [isSheetSidebarOpen, setSheetSidebarOpen] = useState(true);
  const [savedSheets, setSavedSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetId, setNewSheetId] = useState('');

  // Tabs State
  const [sheetTabs, setSheetTabs] = useState([]); 
  const [activeTab, setActiveTab] = useState('ALL');

  // Edit State
  const [editingItem, setEditingItem] = useState(null);
  const [isNewMode, setIsNewMode] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/config/sheets')
        .then(r => r.json())
        .then(data => {
            const safeData = Array.isArray(data) ? data : [];
            setSavedSheets(safeData);
            if(safeData.length > 0) setActiveSheet(safeData[0]);
        });
    fetchQuestions();
  }, []);

  const fetchQuestions = () => {
      fetch('http://localhost:3001/api/questions')
        .then(r => r.json())
        .then(data => {
            const safeData = Array.isArray(data) ? data : [];
            setQuestions(safeData);
            extractTabs(safeData);
        })
        .catch(() => setQuestions([]));
  };

  const extractTabs = (data) => {
      const tabs = [...new Set(data.map(item => item._Source_Sheet).filter(Boolean))];
      setSheetTabs(tabs);
      if(tabs.length > 0) setActiveTab(tabs[0]);
      else setActiveTab('ALL');
  };

  const saveSheetConfig = async () => {
    if(!newSheetName || !newSheetId) return alert("Enter details");
    if(savedSheets.some(s => s.id === newSheetId)) return alert("Sheet ID exists");

    await fetch('http://localhost:3001/api/config/sheets', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: newSheetName, id: newSheetId })
    });
    setSavedSheets([...savedSheets, { name: newSheetName, id: newSheetId }]);
    setNewSheetName(''); setNewSheetId('');
  };

  const deleteSheetConfig = async (e, id, name) => {
      e.stopPropagation();
      if(!confirm(`Delete connection to "${name}"?`)) return;
      await fetch(`http://localhost:3001/api/config/sheets/${id}`, { method: 'DELETE' });
      const newList = savedSheets.filter(s => s.id !== id);
      setSavedSheets(newList);
      if(activeSheet?.id === id) setActiveSheet(null);
  };

  const handleSync = async () => {
    if(!activeSheet) return alert("Select a sheet");
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/sync', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetId: activeSheet.id })
      });
      const data = await res.json();
      const newData = data.data || [];
      setQuestions(newData);
      extractTabs(newData);
      alert(`Synced ${data.count} rows.`);
    } catch(e) { alert("Sync Failed"); }
    setLoading(false);
  };

  const handleSaveOnline = async () => {
      if(!activeSheet) return;
      const endpoint = isNewMode ? '/api/google-append' : '/api/google-update';
      const method = isNewMode ? 'POST' : 'PUT';
      
      try {
          const res = await fetch(`http://localhost:3001${endpoint}`, {
              method, headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  sheetId: activeSheet.id, 
                  data: editingItem, 
                  questionId: editingItem.Q_ID 
              })
          });
          const result = await res.json();
          if(result.success) {
              setEditingItem(null);
              if(isNewMode) {
                  const newQ = { ...editingItem, _Source_Sheet: activeTab === 'ALL' ? 'Unknown' : activeTab };
                  setQuestions([...questions, newQ]);
              } else {
                  setQuestions(questions.map(q => q.Q_ID === editingItem.Q_ID ? editingItem : q));
              }
              alert("Saved!");
          } else alert(result.error);
      } catch(e) { alert("Network Error"); }
  };

  const handleAddNew = () => {
      if(questions.length === 0) return alert("Sync first");
      const empty = {};
      Object.keys(questions[0]).forEach(k => empty[k] = "");
      if(empty.hasOwnProperty('Q_ID')) empty['Q_ID'] = `NEW-${Date.now().toString().slice(-5)}`;
      if(empty.hasOwnProperty('_Source_Sheet') && activeTab !== 'ALL') empty['_Source_Sheet'] = activeTab;
      setEditingItem(empty);
      setIsNewMode(true);
  };

  const filtered = questions.filter(q => {
      if (activeTab !== 'ALL' && q._Source_Sheet !== activeTab) return false;
      return JSON.stringify(q).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const columns = questions.length > 0 ? Object.keys(questions[0]) : [];

  return (
    <div className="h-full flex bg-[#0f172a] overflow-hidden">
        {/* INNER SIDEBAR */}
        <div className={`${isSheetSidebarOpen ? 'w-64' : 'w-12'} bg-[#1e293b] border-r border-slate-700 flex flex-col transition-all duration-300 shadow-xl z-20`}>
            <div className="h-14 flex items-center justify-between px-3 border-b border-slate-700">
                {isSheetSidebarOpen && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sources</span>}
                <button onClick={() => setSheetSidebarOpen(!isSheetSidebarOpen)} className="p-1 hover:text-white text-slate-400"><Sidebar size={14}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {savedSheets.map((sheet, idx) => (
                    <div key={idx} className="group relative">
                        <button 
                            onClick={() => setActiveSheet(sheet)} title={sheet.name}
                            className={`w-full text-left px-2 py-2.5 rounded-lg flex items-center gap-3 transition-all border border-transparent
                            ${activeSheet?.id === sheet.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:border-slate-700'}`}
                        >
                            <FileSpreadsheet size={16} className="shrink-0"/>
                            {isSheetSidebarOpen && <span className="text-xs font-bold truncate pr-6">{sheet.name}</span>}
                        </button>
                        {isSheetSidebarOpen && (
                            <button onClick={(e) => deleteSheetConfig(e, sheet.id, sheet.name)} className="absolute right-2 top-2.5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={12}/>
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {isSheetSidebarOpen && (
                <div className="p-3 border-t border-slate-700 bg-slate-900">
                    <input className="w-full bg-[#1e293b] border border-slate-600 rounded p-2 text-xs text-white mb-2" placeholder="Name" value={newSheetName} onChange={e=>setNewSheetName(e.target.value)} />
                    <input className="w-full bg-[#1e293b] border border-slate-600 rounded p-2 text-xs text-white mb-2 font-mono" placeholder="ID" value={newSheetId} onChange={e=>setNewSheetId(e.target.value)} />
                    <button onClick={saveSheetConfig} className="w-full bg-slate-700 hover:bg-white hover:text-black text-white text-xs py-2 rounded font-bold">+ CONNECT</button>
                </div>
            )}
        </div>

        {/* MAIN TABLE */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a] relative">
            <div className="h-14 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center px-4 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">{activeSheet ? activeSheet.name : "No Source Selected"}</h2>
                    <div className="h-4 w-px bg-slate-600"></div>
                    <span className="text-xs text-slate-400 font-mono">{filtered.length} ROWS</span>
                </div>
                <div className="flex gap-2">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-3 pr-3 py-1.5 bg-[#0f172a] border border-slate-600 rounded text-xs text-white focus:border-blue-500 w-48 outline-none"/>
                    <button onClick={handleAddNew} disabled={!activeSheet} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold text-xs flex gap-2 items-center"><Plus size={14}/> NEW</button>
                    <button onClick={handleSync} disabled={loading || !activeSheet} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-bold text-xs flex gap-2 items-center"><RefreshCw size={14} className={loading?"animate-spin":""}/> SYNC</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#0f172a] custom-scrollbar relative">
                {activeSheet ? (
                    <table className="min-w-max text-left text-xs border-collapse">
                        <thead className="bg-[#1e293b] text-slate-300">
                            <tr>
                                <th className="p-2 border border-slate-700 w-10 text-center sticky top-0 left-0 z-30 bg-[#1e293b] shadow-md">#</th>
                                {columns.map(c => (
                                    <th key={c} className="p-2 border border-slate-700 font-bold min-w-[100px] whitespace-nowrap text-blue-400 select-none sticky top-0 z-20 bg-[#1e293b]">
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 font-mono bg-[#0f172a]">
                            {filtered.map((q, i) => (
                                <tr key={i} className="hover:bg-slate-800/80 transition-colors group">
                                    <td className="p-1 border border-slate-700 text-center sticky left-0 z-10 bg-[#0f172a] group-hover:bg-[#1e293b] shadow-md">
                                        <button onClick={()=>{setIsNewMode(false); setEditingItem({...q})}} className="p-1 hover:text-white text-slate-500"><Edit3 size={12}/></button>
                                    </td>
                                    {columns.map(c => (
                                        <td key={c} className="p-2 border border-slate-700 max-w-[300px] truncate whitespace-nowrap overflow-hidden">{q[c]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 opacity-50 flex-col"><Database size={48} className="mb-2"/><p>Select a Data Source</p></div>
                )}
            </div>

            {/* TABS */}
            {activeSheet && sheetTabs.length > 0 && (
                <div className="h-9 bg-[#1e293b] border-t border-slate-700 flex items-end px-2 gap-1 overflow-x-auto z-20 shrink-0">
                    <button onClick={() => setActiveTab('ALL')} className={`px-4 py-1.5 text-[10px] font-bold rounded-t-md border-t border-x border-slate-600 transition-colors ${activeTab === 'ALL' ? 'bg-[#0f172a] text-white border-b-0' : 'bg-[#1e293b] text-slate-500 hover:text-slate-300'}`}>ALL</button>
                    {sheetTabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-[10px] font-bold rounded-t-md border-t border-x border-slate-600 transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#0f172a] text-brand-blue border-b-0 relative top-[1px]' : 'bg-[#1e293b] text-slate-500 hover:text-slate-300'}`}>{tab}</button>
                    ))}
                </div>
            )}
        </div>

        {/* EDIT MODAL */}
        {editingItem && (
            <div className="absolute inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="bg-[#1e293b] border border-slate-600 rounded-xl w-full max-w-5xl max-h-full flex flex-col shadow-2xl animate-in zoom-in-95">
                    <div className="p-5 border-b border-slate-700 flex justify-between bg-[#0f172a] rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <h3 className="text-white font-bold text-lg">{isNewMode ? "New Entry" : "Edit Row"}</h3>
                            {isNewMode && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold">APPEND MODE</span>}
                        </div>
                        <button onClick={()=>setEditingItem(null)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-x-8 gap-y-6 bg-[#0f172a]">
                        {Object.keys(editingItem).map(col => <SmartField key={col} label={col} value={editingItem[col]} onChange={(val) => setEditingItem(prev => ({...prev, [col]: val}))} />)}
                    </div>
                    <div className="p-5 border-t border-slate-700 bg-[#1e293b] rounded-b-xl flex justify-end gap-3">
                        <button onClick={()=>setEditingItem(null)} className="text-xs font-bold text-slate-400 px-4 hover:text-white">CANCEL</button>
                        <button onClick={handleSaveOnline} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"><Cloud size={16}/> {isNewMode ? "APPEND TO SHEET" : "UPDATE SHEET"}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// ==========================================
// 3. MAIN APP SHELL
// ==========================================
function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMainSidebarOpen, setMainSidebarOpen] = useState(true);

  useEffect(() => {
      const saved = localStorage.getItem('manya_user');
      if(saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (u) => { setUser(u); localStorage.setItem('manya_user', JSON.stringify(u)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('manya_user'); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-[#020617] text-white font-sans overflow-hidden">
      
      {/* MAIN SIDEBAR */}
      <aside className={`${isMainSidebarOpen ? 'w-64' : 'w-20'} bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-2xl z-50 transition-all duration-300`}>
        <div className="p-6 flex items-center justify-between">
            {isMainSidebarOpen ? <h1 className="text-xl font-black tracking-tight flex items-center gap-2"><div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">M</div> MANYA</h1> : <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center mx-auto">M</div>}
            <button onClick={() => setMainSidebarOpen(!isMainSidebarOpen)} className={`text-slate-500 hover:text-white ${!isMainSidebarOpen && 'hidden'}`}><ChevronLeft size={16}/></button>
        </div>
        
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {!isMainSidebarOpen && <button onClick={() => setMainSidebarOpen(true)} className="w-full flex justify-center py-2 text-slate-500 hover:text-white mb-4"><ChevronRight size={16}/></button>}
            
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<LayoutGrid size={20}/>} label="Dashboard" />
            <div className="py-2"><div className="h-px bg-slate-800 mx-2"></div></div>
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='assets'} onClick={()=>setActiveTab('assets')} icon={<FolderOpen size={20}/>} label="Asset Manager" />
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='code'} onClick={()=>setActiveTab('code')} icon={<Code size={20}/>} label="Code Editor" />
            <div className="py-2"><div className="h-px bg-slate-800 mx-2"></div></div>
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='curriculum'} onClick={()=>setActiveTab('curriculum')} icon={<BookOpen size={20}/>} label="Curriculum" />
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='questions'} onClick={()=>setActiveTab('questions')} icon={<Database size={20}/>} label="Question Bank" />
            <div className="py-2"><div className="h-px bg-slate-800 mx-2"></div></div>
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='editor'} onClick={()=>setActiveTab('editor')} icon={<Scissors size={20}/>} label="Image Studio" />
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='3d'} onClick={()=>setActiveTab('3d')} icon={<Box size={20}/>} label="3D Hotspotter" />
            <NavBtn isOpen={isMainSidebarOpen} active={activeTab==='2d'} onClick={()=>setActiveTab('2d')} icon={<ImageIcon size={20}/>} label="Image Annotator" />
        </div>

        <div className="p-4 border-t border-slate-800 bg-[#0b1221]">
            <div className={`flex items-center gap-3 ${!isMainSidebarOpen && 'justify-center'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-xs text-white shadow-lg">{user.username[0].toUpperCase()}</div>
                {isMainSidebarOpen && <div className="overflow-hidden flex-1"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-[10px] text-green-400 font-mono uppercase">{user.role} ACCESS</p></div>}
                {isMainSidebarOpen && <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={16}/></button>}
            </div>
        </div>
      </aside>
      
      {/* CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden bg-[#020617]">
         {activeTab === 'dashboard' && <DashboardHome user={user} />}
         {activeTab === 'questions' && <QuestionBank />}
         {activeTab === 'curriculum' && <div className="h-full p-6"><CurriculumManager /></div>}
         {activeTab === 'assets' && <div className="h-full"><AssetManager /></div>}
         {activeTab === 'code' && <div className="h-full"><CodeStudio /></div>}
         {activeTab === 'editor' && <div className="h-full p-6"><ImageEditor /></div>}
         {activeTab === '3d' && <div className="h-full p-6"><ThreeDHotspotter /></div>}
         {activeTab === '2d' && <div className="h-full p-6"><ImageHotspotter /></div>}
      </main>
    </div>
  )
}

const NavBtn = ({ isOpen, active, onClick, icon, label }) => (
  <button onClick={onClick} title={label} className={`w-full flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 text-sm font-medium rounded-xl transition-all ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
    {icon} {isOpen && <span>{label}</span>}
  </button>
);

export default App;