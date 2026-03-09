import React from 'react';
import { Card, CardBody, CardHeader, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import type { Round, RoundProgress } from '../types';
import { Lock, Play, CheckCircle, Clock } from 'lucide-react';

interface RoundCardProps {
    round: Round;
    progress: RoundProgress | undefined;
    isUnlocked: boolean;
    onAction: () => void;
    roundIndex?: number;
}

export const RoundCard: React.FC<RoundCardProps> = ({ round, progress, isUnlocked, onAction, roundIndex }) => {
    const status = progress?.status || (isUnlocked ? 'available' : 'locked');

    const getStatusDisplay = () => {
        switch (status) {
            case 'locked':
                return { label: 'Locked', badge: 'default', icon: <Lock size={14} className="mr-1" /> };
            case 'available':
                return { label: 'Available', badge: 'info', icon: <Play size={14} className="mr-1" /> };
            case 'in_progress':
                return { label: 'In Progress', badge: 'warning', icon: <Clock size={14} className="mr-1" /> };
            case 'submitted':
                return { label: 'Submitted', badge: 'success', icon: <CheckCircle size={14} className="mr-1" /> };
            default:
                return { label: 'Unknown', badge: 'default', icon: null };
        }
    };

    const display = getStatusDisplay();

    const getActionButtonText = () => {
        const title = roundIndex !== undefined ? `Round ${roundIndex + 1}` : 'Investigation';
        switch (status) {
            case 'available': return `Enter ${title}`;
            case 'in_progress': return `Resume ${title}`;
            case 'submitted': return `View ${title} Results`;
            default: return 'Locked';
        }
    };

    return (
        <Card hoverEffect={isUnlocked} className={status === 'locked' ? 'opacity-75 bg-slate-50' : ''}>
            <CardHeader className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{round.title}</h3>
                </div>
                <Badge variant={display.badge as any}>
                    {display.icon}
                    {display.label}
                </Badge>
            </CardHeader>

            <CardBody className="pt-2 pb-4">
                <p className="text-sm text-slate-600 mb-4">{round.description}</p>

                {status === 'in_progress' && progress && progress.timeRemainingMs && (
                    <div className="flex items-center gap-2 text-xs font-medium text-warning-text bg-warning-bg px-2 py-1 rounded inline-flex mb-2">
                        <Clock size={12} />
                        <span>
                            Time Remaining: {Math.max(0, Math.floor(progress.timeRemainingMs / 60000))}m {Math.floor((progress.timeRemainingMs % 60000) / 1000)}s
                        </span>
                    </div>
                )}
            </CardBody>

            <CardFooter className="flex justify-end">
                <Button
                    variant={status === 'submitted' ? 'outline' : 'primary'}
                    disabled={status === 'locked'}
                    onClick={onAction}
                >
                    {getActionButtonText()}
                </Button>
            </CardFooter>
        </Card>
    );
};
