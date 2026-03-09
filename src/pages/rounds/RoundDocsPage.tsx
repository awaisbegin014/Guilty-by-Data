import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockRounds } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export const RoundDocsPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { markDocsVisited, roundsProgress } = useAppStore();

    const round = mockRounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    useEffect(() => {
        if (roundId && progress?.status !== 'submitted') {
            markDocsVisited(roundId);
        }
    }, [roundId, markDocsVisited, progress?.status]);

    if (!round) {
        return <div className="container py-8">Case File not found.</div>;
    }

    if (progress?.status === 'submitted') {
        navigate(`/round/${round.id}/submitted`, { replace: true });
        return null;
    }

    return (
        <div className="pt-8 pb-16 animate-fade-in relative">
            <TimerBanner roundId={round.id} />

            <div className="container mt-8 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-200 p-2 rounded-lg text-slate-700">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Investigation Docs</h2>
                            <p className="text-slate-500 text-sm">Case Reference File</p>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => navigate(`/round/${round.id}`)}>
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Case Brief
                    </Button>
                </div>

                <div className="flex flex-col gap-6">
                    {round.documentation.map((doc, idx) => (
                        <Card key={idx}>
                            <CardHeader>
                                <h3 className="text-lg font-bold text-slate-800">{doc.sectionTitle}</h3>
                            </CardHeader>
                            <CardBody className="pt-2">
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100 italic">
                                    "{doc.content}"
                                </p>
                            </CardBody>
                        </Card>
                    ))}

                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="primary"
                            className="py-3 px-8 text-base"
                            onClick={() => navigate(`/round/${round.id}/q/0`)}
                        >
                            Proceed to Interrogation
                            <ArrowRight size={18} className="ml-2" />
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
