import {
    ic,
    nat64,
    Opt,
    Principal,
    $update,
    $query,
    stable,
    match
} from 'azle';

type Poll = {
    id: string;
    question: string;
    options: string[];
    votes: { [option: string]: number };
    createdBy: Principal;
    createdAt: nat64;
};

type CreatePollRequest = {
    question: string;
    options: string[];
};

type VoteRequest = {
    pollId: string;
    option: string;
};

type PollResult = {
    question: string;
    options: string[];
    votes: { [option: string]: number };
};

let polls: { [id: string]: Poll } = stable({});
let pollCount: nat64 = stable(0);

function generateId(): string {
    pollCount += 1n;
    return pollCount.toString();
}

$update;
export function createPoll(request: CreatePollRequest): Poll {
    const id = generateId();
    const now = ic.time();
    const poll: Poll = {
        id,
        question: request.question,
        options: request.options,
        votes: request.options.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
        }, {} as { [option: string]: number }),
        createdBy: ic.caller(),
        createdAt: now
    };
    polls[id] = poll;
    return poll;
}

$query;
export function getPoll(id: string): Opt<Poll> {
    return match(polls[id], {
        Some: (poll) => poll,
        None: null
    });
}

$update;
export function vote(request: VoteRequest): string {
    const poll = polls[request.pollId];
    if (!poll) {
        return "Poll not found";
    }
    if (!poll.options.includes(request.option)) {
        return "Invalid option";
    }
    poll.votes[request.option] += 1;
    return "Vote cast successfully";
}

$query;
export function getResults(id: string): Opt<PollResult> {
    const poll = polls[id];
    if (!poll) {
        return null;
    }
    return {
        question: poll.question,
        options: poll.options,
        votes: poll.votes
    };
}

$query;
export function getAllPolls(): Poll[] {
    return Object.values(polls);
}

