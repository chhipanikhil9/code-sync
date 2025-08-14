import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from './ui/label';

const topics = ["Arrays", "Strings", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Stacks & Queues"];
const difficulties = ["Easy", "Medium", "Hard"];

const AIQuestionGenerator = ({ onQuestionGenerated }) => {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleGenerate = async () => {
        if (!topic || !difficulty) {
            toast.error("Please select a topic and difficulty.");
            return;
        }
        setIsLoading(true);
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post('http://localhost:3001/api/ai/generate-question', {
                topic,
                difficulty,
            });
            // Pass the generated question data up to the parent component
            onQuestionGenerated(response.data);
            toast.success("New question generated!");
            setIsOpen(false); // Close the dialog on success
        } catch (error) {
            toast.error("Failed to generate a question. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button >Generate AI Question</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                    <DialogTitle>Generate DSA Question</DialogTitle>
                    <DialogDescription>
                        Select a topic and difficulty to generate a new question.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="topic" className="text-right">
                            Topic
                        </Label>
                        <Select onValueChange={setTopic}>
                            <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600">
                                <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                                {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="difficulty" className="text-right">
                            Difficulty
                        </Label>
                        <Select onValueChange={setDifficulty}>
                            <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600">
                                <SelectValue placeholder="Select a difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? 'Generating...' : 'Generate'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AIQuestionGenerator;
