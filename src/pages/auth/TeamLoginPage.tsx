import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search } from 'lucide-react';

export const TeamLoginPage: React.FC = () => {
    const [teamId, setTeamId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { setTeam } = useAppStore();
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!teamId || !password) {
            setError('Please enter both Team ID and Password.');
            return;
        }

        setIsLoading(true);

        // Mock authentication delay
        setTimeout(() => {
            setIsLoading(false);
            // For this mock app, any credentials work if they are non-empty
            if (password.length >= 4) {
                setTeam({
                    id: teamId.toLowerCase().replace(/\s+/g, '-'),
                    name: teamId || 'Investigator Team'
                });
                navigate('/dashboard');
            } else {
                setError('Invalid credentials. Password must be at least 4 characters.');
            }
        }, 800);
    };

    return (
        <div className="container flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md w-full animate-fade-in mt-12">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-xl mb-4 shadow-lg shadow-slate-900/20">
                        <Search size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Login Required</h1>
                    <p className="text-slate-600">Enter your team credentials to begin the investigation.</p>
                </div>

                <Card>
                    <CardBody>
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label htmlFor="teamId" className="text-sm font-semibold text-slate-700">Team ID or Name</label>
                                <input
                                    id="teamId"
                                    type="text"
                                    className="input"
                                    placeholder="e.g. DataSleuths"
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Access Key</label>
                                <input
                                    id="password"
                                    type="password"
                                    className="input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="mt-4">
                                <Button
                                    type="submit"
                                    fullWidth
                                    className="py-3 text-base"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Authenticating...' : 'Access Case Files'}
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>

                <p className="text-center text-slate-400 text-sm mt-8">
                    Authorized personnel only. All access is logged.
                </p>
            </div>
        </div>
    );
};
