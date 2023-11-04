/**
 * In this file we will teach on how to handle errors in the periodic hook and 
 * in all hooks generated in this library.
 */
import React from 'react';
import { generatePeriodicHook } from '../src/hook_builder'

type User = {
    id: number;
    name: string;
    email: string;
    friendsOnline: number;
};

type UserError = {
    message: string;
};

function isUserData(data: unknown): data is User {
    /** 
     * We will implement a simple validation function to check if the data is a valid user
     * but we recommend using third-party libaries for that. Plese check the section
     * "Data Integrity" in the README.md file for more information.
     */

    if (typeof data !== 'object' || data === null) {
        return false;
    }

    if(Object.keys(data).length !== 4) {
        return false;
    }

    if (typeof (data as User).id !== 'number') {
        return false;
    }

    if (typeof (data as User).name !== 'string') {
        return false;
    }

    if (typeof (data as User).email !== 'string') {
        return false;
    }

    if (typeof (data as User).friendsOnline !== 'number') {
        return false;
    }

    return true;

}



const generatorResponse = generatePeriodicHook<User, UserError> (
    // First we will set the fetch user function
    async (userId, notifyObservers) => {

        let response: null | unknown = null;

        // In this example we will use a try/catch block to notify the components if any
        // error happens during the fetching of the user data.
        try {
            response = await fetch('https://example.com/api/user/' + userId);
        } catch (error) {
            // We will notify the observers with the error
            notifyObservers(null, {message: 'There was an error fetching the user data'});
            return;
        }

        if(isUserData(response)) {
            notifyObservers(response, null);
        else{
            // We will notify the observers with the error
            notifyObservers(null, {message: 'The response sent by the server is not valid'});
        }
    }, 
    5000, // Then we will set the interval to 5 seconds

)


// We will create now a simple useUser
const useUser = generatorResponse.hook;

// Simple right? Now we will use it in a component
// Simple right? Now we will use it in a component
const UserComponent = () => {
    // We will use the hook to get the user data
    const [user, error] = useUser('1');

    // First we will check for errors
    if (error !== null) {
        return <p>{error.message}</p>
    }

    // Now that we now that our component has no errors
    // we will check if the user has been fetched yet
    if (user === null) {
        return <p>Loading...</p>
    }

    
    // Finally we will render the user data
    return (
        <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
            <p>Friends online: {user.friendsOnline}</p>
        </div>
    )
}

/**
 * Easy right? But there still is a problem. The user name and email probrably will never change after loading. While the friends online
 * will change constantly. We will show how to handle it in the next example.
 */