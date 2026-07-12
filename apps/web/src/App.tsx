import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './routes/Login';
import { Dashboard } from './routes/Dashboard';
import { TemplatesList } from './routes/TemplatesList';
import { TemplateEditor } from './routes/TemplateEditor';
import { ContactsList } from './routes/ContactsList';
import { ContactDetail } from './routes/ContactDetail';
import { SequencesList } from './routes/SequencesList';
import { SequenceBuilder } from './routes/SequenceBuilder';
import { CampaignsList } from './routes/CampaignsList';
import { CampaignCompose } from './routes/CampaignCompose';
import { CampaignDetail } from './routes/CampaignDetail';
import { SenderAccountsSettings } from './routes/SenderAccountsSettings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="contacts" element={<ContactsList />} />
            <Route path="contacts/:id" element={<ContactDetail />} />
            <Route path="templates" element={<TemplatesList />} />
            <Route path="templates/new" element={<TemplateEditor />} />
            <Route path="templates/:id" element={<TemplateEditor />} />
            <Route path="sequences" element={<SequencesList />} />
            <Route path="sequences/:id" element={<SequenceBuilder />} />
            <Route path="campaigns" element={<CampaignsList />} />
            <Route path="campaigns/new" element={<CampaignCompose />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="settings/sender-accounts" element={<SenderAccountsSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
