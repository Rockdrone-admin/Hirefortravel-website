"use client";
import ActivityTimeline from '../../../components/ActivityTimeline';

export default function ActivityTimelinePage() {
  return (
    <main>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Activity Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">A unified global timeline of all system activity.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ActivityTimeline 
          title="Complete Event Stream" 
          limit={20} 
          enableControls={true}
        />
      </div>
    </main>
  );
}
