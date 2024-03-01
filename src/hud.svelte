<script lang="ts">
    import { createEventDispatcher } from "svelte";

    let visible = true;
    const helpModes = ['None', 'Auto Answer (instant)', 'Auto Answer (wait)', 'Outline Correct Answer']
    let helpMode = 0;

    let dispatch = createEventDispatcher();

    function changeHelpMode(change: number) {
        helpMode += change;
        if (helpMode < 0) helpMode += helpModes.length;
        helpMode %= helpModes.length;

        dispatch('helpMode', helpMode);
    }

    function onKeyDown(event: KeyboardEvent) {
        if(event.key !== '\\') return;

        visible = !visible;
    }
</script>

<svelte:window on:keydown={onKeyDown} />

{#if visible}
    <div class="hud">
        <button on:click={() => dispatch('answer')} class="answer">Answer Question</button>
        <div class="help">
            <div>
                Help Mode
            </div>
            <div class="row helpControl">
                <button on:click={() => changeHelpMode(-1)}>&lt;</button>
                <div class="display">{ helpModes[helpMode] }</div>
                <button on:click={() => changeHelpMode(1)}>&gt;</button>
            </div>
        </div>
    </div>
{/if}

<style>
.hud {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 300px;
    height: 200px;
    z-index: 999999999999;
    background-color: rgba(0, 0, 0, 0.9);
    border-radius: 0.5em;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    color: white;
}

.hud .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: space-between;
    width: 100%;
}

.hud .answer {
    width: 70%;
    height: 50px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 1em;
    border-radius: 0.5em;
    background-color: white;
    color: black;
    border: none;
    transition: transform 0.3s ease;
}

.hud .answer:active {
    transform: scale(0.93);
}

.hud .help {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 85%;
}

.hud .helpControl button {
    width: 25px;
    height: 25px;
    border-radius: 0.5em;
    background-color: white;
    border: none;
    transition: transform 0.3s ease;
    margin: 5px;
    color: black;
}
</style>