import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './routes/Dashboard';
import { TemplatesList } from './routes/TemplatesList';
import { TemplateEditor } from './routes/TemplateEditor';
import { ContactsList } from './routes/ContactsList';
import { ContactDetail } from './routes/ContactDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contacts" element={<ContactsList />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="templates" element={<TemplatesList />} />
          <Route path="templates/new" element={<TemplateEditor />} />
          <Route path="templates/:id" element={<TemplateEditor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
