import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { RequireWorkspace } from './RequireWorkspace'
import { WelcomeScreen } from '../features/welcome/WelcomeScreen'
import { CaptureScreen } from '../features/capture/CaptureScreen'
import { ImportanceReviewScreen } from '../features/review/ImportanceReviewScreen'
import { MatrixScreen } from '../features/matrix/MatrixScreen'
import { CompareScreen } from '../features/compare/CompareScreen'
import { StructureScreen } from '../features/structure/StructureScreen'
import { ActionsScreen } from '../features/actions/ActionsScreen'
import { RoadmapScreen } from '../features/roadmap/RoadmapScreen'
import { RoadmapIndexScreen } from '../features/roadmap/RoadmapIndexScreen'
import { DimensionSettingsScreen } from '../features/settings/DimensionSettingsScreen'
import { RuleSettingsScreen } from '../features/settings/RuleSettingsScreen'
import { DataSettingsScreen } from '../features/settings/DataSettingsScreen'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route element={<RequireWorkspace />}>
          <Route path="/capture" element={<CaptureScreen />} />
          <Route path="/review/importance" element={<ImportanceReviewScreen />} />
          <Route path="/matrix" element={<MatrixScreen />} />
          <Route path="/compare" element={<CompareScreen />} />
          <Route path="/structure" element={<StructureScreen />} />
          <Route path="/actions" element={<ActionsScreen />} />
          <Route path="/roadmap" element={<RoadmapIndexScreen />} />
          <Route path="/roadmap/:thoughtId" element={<RoadmapScreen />} />
          <Route path="/settings/dimensions" element={<DimensionSettingsScreen />} />
          <Route path="/settings/rules" element={<RuleSettingsScreen />} />
          <Route path="/settings/data" element={<DataSettingsScreen />} />
        </Route>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        {/* Unknown routes fall back to a valid screen. */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Route>
    </Routes>
  )
}
