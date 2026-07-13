import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './routes/Login';
import { ForgotPassword } from './routes/ForgotPassword';
import { ResetPassword } from './routes/ResetPassword';
import { Dashboard } from './routes/Dashboard';
import { TemplatesList } from './routes/TemplatesList';
import { TemplateEditor } from './routes/TemplateEditor';
import { ContactsList, ListDetail } from './routes/ContactsList';
import { ContactDetail } from './routes/ContactDetail';
import { SequencesList } from './routes/SequencesList';
import { SequenceBuilder } from './routes/SequenceBuilder';
import { CampaignsList } from './routes/CampaignsList';
import { CampaignCompose } from './routes/CampaignCompose';
import { CampaignDetail } from './routes/CampaignDetail';
import { SenderAccountsSettings } from './routes/SenderAccountsSettings';
import { EmailLog } from './routes/EmailLog';
import { ListsAndTags } from './routes/ListsAndTags';
import { Verification } from './routes/Verification';
import { Triggers } from './routes/Triggers';
import { TriggerDetail } from './routes/TriggerDetail';
import { Webhooks } from './routes/Webhooks';
import { Settings } from './routes/Settings';
import { Profile } from './routes/Profile';
import { ChangePassword } from './routes/ChangePassword';
import { About } from './routes/About';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
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
            <Route path="email-log" element={<EmailLog />} />
            <Route path="lists" element={<ListsAndTags />} />
            <Route path="lists/:id" element={<ListDetail />} />
            <Route path="verification" element={<Verification />} />
            <Route path="triggers" element={<Triggers />} />
            <Route path="triggers/:id" element={<TriggerDetail />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/change-password" element={<ChangePassword />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
