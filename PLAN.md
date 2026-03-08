the todo file is separated at the top by a very thick line


everything above the line is treated as a thing that we want to do, could be text ideas w/e

████████████████████████████████████████████████████████████████████████████████

below the are the actually created todos by the ai.

when we say `@pinky` the ai should pick the most impactful relevant next todo.
gather context using the pinky-and-the-brain skill, and then solve that todo.
deleting it after its done and making a commit with the changes.

this way we can input ideas, see the todos in the file, and then audit them if needed.
and send em to the ai to process.

we can even do this with a cron job, so the ai constantly indexes the todos.
this is what i plan with my editor.

we have one global chat file, we say what we want to do.
the ai prepares patches, we can step trough them, audit them, and then let the ai rework
the things based on my changes.

all of this can happen via commits, we can create a to_review.md that updates when a todo is done and needs reviewing.

the file for that is the `@brain` file inside the SOURCE REPO.
when installing and it doesnt exist, we should fill it and add todos to index the codebase.
