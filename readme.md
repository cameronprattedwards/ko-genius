KO-Genius
=========

Knockout makes it easy to bind view models to the DOM. But once you need to do extensive interaction with the server
and pull down view models using AJAX, your work becomes tedious, complicated, and filled with boilerplate.
KO-Genius helps circumvent all of that with callback-free view model definitions and instantiations. No mapping required.
Automatic parsing. 

And, unlike KnockBack, KO-Genius integrates with Knockout at its deepest levels, meaning smaller
downloads and much greater efficiency. KO-Genius is just like [Genius] (http://geniusjs.com 'Genius'), 
but with a few useful additions that make working with KnockoutJS super easy.

To use KO-Genius, just include it on the page after Knockout. Then you're ready to start working.

Benefits
--------

For starters, any Genius resource property created using a `genius.types.*` method will be a Knockout observable. For example, consider the following
model definition:

	var Zombie = genius.Resource.extend({
		name: genius.types.string(),
		id: genius.types.number(),
		age: genius.types.number(),
		url: "/zombies/:id"
	});

	var zombies = Zombie.$query();
	ko.applyBindings({ myZombies: zombies });

Now use the following markup:
	
	<img src="spinner.gif" data-bind="visible: myZombies.isLoading" />
	<div data-bind="foreach: myZombies">
		<p>
			Name: 
			<span data-bind="text: name"></span>, 
			ID: 
			<span data-bind="text: id"></span>, 
			Age: 
			<span data-bind="text: age"></span>
		</p>
	</div>

`zombies` will become an observable array, and Knockout will render a list of
your zombies, all with their appropriate information. `name`, `id`, and `age` will all be knockout observables.
What's more, Resource meta-properties,
such as `isLoading`, `isDirty`, `isDeleted`, and `isNew` are all observable, so you're
free to use them as you please in your Knockout bindings. In this example, the spinner will appear when the 
zombies request begins, and will disappear when the request returns.









