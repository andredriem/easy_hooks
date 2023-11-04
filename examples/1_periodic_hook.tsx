// In this file we will implement that fetches the user data every 5 seconds
import React from 'react';
import { generatePeriodicHook } from 'easy-hooks';

type User = {
    id: number;
    name: string;
    email: string;
    friendsOnline: number;
};

const generatorResponse = generatePeriodicHook<User, null> (
    // First we will set the fetch user function
    async (userId, notifyObservers) => {
        const response = await fetch('https://example.com/api/user/' + userId);

        // We will skip validating the response in this example. We suggest you looking at the section
        // "Data Integrity" in the README.md file to see how to validate the response
        const user = await response.json() as User;

        // We will notify the observers with the user data
        notifyObservers(user, null);

    }, 
    5000, // Then we will set the interval to 5 seconds

)

// We will create now a simple useUser
const useUser = generatorResponse.hook;

// Simple right? Now we will use it in a component
const UserComponent = () => {
    // We will use the hook to get the user data
    const [user] = useUser('1');

    // If user is null it means the data has not been fetched yet or there was an error
    if (user === null) {
        return <p>Loading...</p>
    }

    
    // We will render the user data
    return (
        <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
            <p>Friends online: {user.friendsOnline}</p>
        </div>
    )
}
    
// Notice on how we are not using the other parameters of the hook. This is beacause we didn't define the error return type.
// This is fine in some cases were we don't want to handle errors be sure to check the example "2_periodic_hook_error_handling.tsx"
