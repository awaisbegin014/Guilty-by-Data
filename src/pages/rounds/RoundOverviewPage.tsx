import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockRounds } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, Database, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

export const RoundOverviewPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { startRound, roundsProgress, unlockedRounds } = useAppStore();

    const round = mockRounds.find(r => r.id === roundId);

    useEffect(() => {
        if (roundId && unlockedRounds.includes(roundId)) {
            startRound(roundId);
        }
    }, [roundId, unlockedRounds, startRound]);

    if (!round) {
        return <div className="container py-8">Case File not found.</div>;
    }

    const progress = roundsProgress[round.id];

    if (progress?.status === 'submitted') {
        navigate(`/round/${round.id}/submitted`, { replace: true });
        return null;
    }

    return (
        <div className="pt-8 pb-16 animate-fade-in relative">
            <TimerBanner roundId={round.id} />

            <div className="container mt-8 max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <Badge variant="info" className="mb-4">ACTIVE INVESTIGATION</Badge>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{round.title}</h2>
                    <p className="text-lg text-slate-600">{round.objective}</p>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Case Brief */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="text-slate-500" size={20} />
                                Case Brief
                            </h3>
                        </CardHeader>
                        <CardBody className="pt-2">
                            <p className="text-slate-700 leading-relaxed">
                                {round.caseBrief}
                            </p>
                        </CardBody>
                    </Card>

                    {/* Dataset Info */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Database className="text-slate-500" size={20} />
                                Evidence Dataset
                            </h3>
                        </CardHeader>
                        <CardBody className="pt-2">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-md mb-4">
                                <h4 className="font-semibold text-slate-900 mb-1">{round.datasetTitle}</h4>
                                <p className="text-sm text-slate-600">{round.datasetDescription}</p>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    useAppStore.getState().markDatasetOpened(round.id);
                                    alert("Dataset would download/open here in a real application.");
                                }}
                            >
                                Access Dataset File
                            </Button>
                        </CardBody>
                    </Card>

                    {/* Investigation Progress */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                Investigation Checklist
                            </h3>
                        </CardHeader>
                        <CardBody className="pt-2">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={20} className="text-success-text" />
                                    <span className="text-slate-700">Review Case Brief</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {progress?.datasetOpened ? (
                                        <CheckCircle2 size={20} className="text-success-text" />
                                    ) : (
                                        <Circle size={20} className="text-slate-300" />
                                    )}
                                    <span className={progress?.datasetOpened ? "text-slate-700" : "text-slate-500"}>
                                        Open Evidence Dataset
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {progress?.docsVisited ? (
                                        <CheckCircle2 size={20} className="text-success-text" />
                                    ) : (
                                        <Circle size={20} className="text-slate-300" />
                                    )}
                                    <span className={progress?.docsVisited ? "text-slate-700" : "text-slate-500"}>
                                        Read Investigation Documentation
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 py-3 text-base"
                            onClick={() => navigate(`/round/${round.id}/docs`)}
                        >
                            <FileText size={18} className="mr-2" />
                            View Documentation
                        </Button>

                        <Button
                            variant="primary"
                            className="flex-1 py-3 text-base"
                            onClick={() => navigate(`/round/${round.id}/q/0`)}
                        >
                            Start Interrogation
                            <ArrowRight size={18} className="ml-2" />
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};
