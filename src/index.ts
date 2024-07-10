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
let pollCount: nat64 = stable(0n);

function generateId(): string {
    pollCount += 1n;
    return pollCount.toString();
}

function isArrayUnique(array: string[]): boolean {
    return new Set(array).size === array.length;
}

$update;
export function createPoll(request: CreatePollRequest): Poll | string {
    if (!isArrayUnique(request.options)) {
        return "Poll options must be unique.";
    }

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

    // Avoid potential race conditions by using a copy of the polls map
    const newPolls = { ...polls, [id]: poll };
    polls = newPolls;

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
export function vote(request: VoteRequest): boolean {
    const poll = polls[request.pollId];
    if (!poll) {
        return false;
    }
    if (!poll.options.includes(request.option)) {
        return false;
    }

    // Create a new poll object to maintain immutability
    const updatedPoll = {
        ...poll,
        votes: {
            ...poll.votes,
            [request.option]: poll.votes[request.option] + 1
        }
    };

    // Avoid potential race conditions by using a copy of the polls map
    const newPolls = { ...polls, [request.pollId]: updatedPoll };
    polls = newPolls;

    return true;
}

$query;
export function getResults(id: string): Opt<PollResult> {
    const poll = polls[id];
    if (!poll) {
        return null;
    }
    return poll; // Directly return the retrieved poll object
}

$query;
export function getAllPolls(): Poll[] {
    return Object.values(polls);
}
