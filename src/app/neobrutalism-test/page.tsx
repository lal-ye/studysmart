
'use client';

import NeobrutalistCard, { type NeobrutalistCardProps } from './_components/NeobrutalistCard';
import NeobrutalistButton from './_components/NeobrutalistButton';

const mockCardsData: NeobrutalistCardProps[] = [
  {
    title: 'Bold Feature X',
    description: 'Experience the raw power of Feature X, designed with unapologetic utility and striking aesthetics. No frills, just function.',
    imageUrl: 'https://picsum.photos/seed/neobrutal1/400/300',
    imageAlt: 'Abstract geometric shapes',
    buttonProps: { children: 'Learn More', href: '#', ariaLabel: 'Learn more about Bold Feature X' },
    backgroundColor: 'bg-lime-400', // Vibrant lime
    textColor: 'text-black',
  },
  {
    title: 'Unfiltered Insights',
    description: 'Dive deep into data with our Neobrutalist analytics dashboard. Clear, direct, and impactful visualizations.',
    imageUrl: 'https://picsum.photos/seed/neobrutal2/400/300',
    imageAlt: 'High contrast data bars',
    buttonProps: { children: 'View Dashboard', href: '#', backgroundColor: 'bg-cyan-400', ariaLabel: 'View the Unfiltered Insights dashboard' },
    backgroundColor: 'bg-orange-400', // Vibrant orange
  },
  {
    title: 'Radical Simplicity',
    description: 'We stripped away the non-essentials. What remains is pure, unadulterated performance and a unique visual identity.',
    // No image for this one to show variation
    buttonProps: { children: 'Get Started', onClick: () => alert('Get Started Clicked!'), backgroundColor: 'bg-rose-500', ariaLabel: 'Get started with Radical Simplicity' },
    backgroundColor: 'bg-purple-400', // Vibrant purple
    textColor: 'text-white', // Example of contrasting text color
    borderColor: 'border-yellow-300',
    shadowColor: 'shadow-[7px_7px_0px_#FFFF00]', // Yellow shadow
  },
  {
    title: 'Connect & Create',
    description: 'A collaborative platform with a straightforward, no-nonsense interface. Built for action.',
    imageUrl: 'https://picsum.photos/seed/neobrutal3/400/300',
    imageAlt: 'Network lines connecting dots',
    buttonProps: { children: 'Join Now', href: '#', backgroundColor: 'bg-teal-400', ariaLabel: 'Join Connect & Create' },
    backgroundColor: 'bg-sky-400',
  },
];

export default function NeobrutalismTestPage() {
  return (
    <div className="min-h-screen bg-neutral-800 p-4 sm:p-8">
      <header className="mb-12 text-center">
        <h1 className="font-sans text-5xl sm:text-6xl font-black text-yellow-300 uppercase tracking-wider"
            style={{ textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
        >
          Neobrutalism Test Zone
        </h1>
        <p className="mt-4 text-lg text-neutral-300 font-sans">
          Exploring raw aesthetics, sharp contrasts, and bold functionality.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="font-sans text-3xl font-bold text-pink-400 mb-6 border-b-4 border-pink-400 pb-2 inline-block"
            style={{ textShadow: '2px 2px 0 #000' }}
        >
          Buttons Showcase
        </h2>
        <div className="flex flex-wrap gap-6 items-center">
          <NeobrutalistButton onClick={() => alert('Primary Action!')} ariaLabel="Primary Neobrutalist action button">
            Primary Action
          </NeobrutalistButton>
          <NeobrutalistButton
            backgroundColor="bg-emerald-500"
            textColor="text-black"
            borderColor="border-black"
            shadowColor="shadow-[4px_4px_0px_#000000]"
            onClick={() => alert('Secondary Action!')}
            ariaLabel="Secondary Neobrutalist action button"
          >
            Secondary Action
          </NeobrutalistButton>
          <NeobrutalistButton
            href="#"
            backgroundColor="bg-neutral-200"
            textColor="text-black"
            borderColor="border-neutral-900"
            shadowColor="shadow-[2px_2px_0px_#000000]"
            className="text-xs px-3 py-1.5"
            ariaLabel="Small link button"
          >
            Small Link
          </NeobrutalistButton>
        </div>
      </section>

      <section>
        <h2 className="font-sans text-3xl font-bold text-lime-400 mb-8 border-b-4 border-lime-400 pb-2 inline-block"
           style={{ textShadow: '2px 2px 0 #000' }}
        >
          Cards Display
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {mockCardsData.map((card, index) => (
            <NeobrutalistCard
              key={card.title + index}
              title={card.title}
              description={card.description}
              imageUrl={card.imageUrl}
              imageAlt={card.imageAlt}
              buttonProps={card.buttonProps}
              backgroundColor={card.backgroundColor}
              textColor={card.textColor}
              borderColor={card.borderColor}
              shadowColor={card.shadowColor}
            />
          ))}
        </div>
         <div className="mt-10 p-6 border-4 border-black shadow-[10px_10px_0px_black] bg-white">
            <h3 className="font-sans text-2xl font-bold text-black mb-4">Example Form Elements</h3>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block font-sans text-sm font-bold text-black mb-1">Name</label>
                    <input type="text" id="name" name="name" className="w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-yellow-300 focus:border-black placeholder-neutral-500 text-black bg-white shadow-[3px_3px_0px_black]" placeholder="Enter your name" />
                </div>
                <div>
                    <label htmlFor="email" className="block font-sans text-sm font-bold text-black mb-1">Email</label>
                    <input type="email" id="email" name="email" className="w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-pink-400 focus:border-black placeholder-neutral-500 text-black bg-white shadow-[3px_3px_0px_black]" placeholder="your@email.com" />
                </div>
                 <div>
                    <label htmlFor="message" className="block font-sans text-sm font-bold text-black mb-1">Message</label>
                    <textarea id="message" name="message" rows={4} className="w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:border-black placeholder-neutral-500 text-black bg-white shadow-[3px_3px_0px_black]" placeholder="Your thoughts..."></textarea>
                </div>
                <NeobrutalistButton type="submit" backgroundColor="bg-orange-500" ariaLabel="Submit form">Send Message</NeobrutalistButton>
            </form>
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t-4 border-dashed border-neutral-700 text-center">
        <p className="text-neutral-400 font-sans text-sm">
          Neobrutalism: Functionality with an edge. All elements styled using Tailwind CSS.
        </p>
      </footer>
    </div>
  );
}
